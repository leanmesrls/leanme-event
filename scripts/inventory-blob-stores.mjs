/**
 * Full inventory of legacy Blob stores (read-only). Never deletes or modifies Blob.
 *
 * Usage:
 *   node --env-file=.env.local scripts/inventory-blob-stores.mjs
 *   node --env-file=.env.local scripts/inventory-blob-stores.mjs --out=tmp/blob-inventory.json
 *
 * Classification only — does not migrate.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { list } from "@vercel/blob";

const outArg = process.argv.find((a) => a.startsWith("--out="));
const outPath =
  outArg?.slice("--out=".length) ||
  path.join("tmp", `blob-inventory-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return new Map();
  const map = new Map();
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    map.set(
      line.slice(0, idx).trim(),
      line.slice(idx + 1).trim().replace(/^["']|["']$/g, "")
    );
  }
  return map;
}

function resolveToken(store) {
  const keys = [store.envKey, store.fallbackEnvKey].filter(Boolean);
  for (const envKey of keys) {
    const direct = process.env[envKey]?.trim();
    if (tokenOk(direct)) return { token: direct, source: `env:${envKey}` };
  }

  // Legacy store often overwritten locally by demo token — recover from prod pulls.
  if (store.id === "leanme-event") {
    for (const file of [
      ".env.vercel.production.pull",
      ".env.vercel.pull",
      ".env.vercel-production.pull",
    ]) {
      const fromFile = parseEnvFile(file).get("BLOB_READ_WRITE_TOKEN");
      if (
        tokenOk(fromFile) &&
        fromFile !== process.env.LEAN_EVENT_TENANT_DEMO_BLOB_TOKEN
      ) {
        return { token: fromFile, source: `file:${file}` };
      }
    }
  }
  return { token: null, source: null };
}

const STORES = [
  {
    id: "leanme-event",
    label: "legacy",
    // Prefer dedicated legacy token; BLOB_READ_WRITE_TOKEN often equals demo.
    envKey: "LEAN_EVENT_LEGACY_BLOB_TOKEN",
    fallbackEnvKey: "BLOB_READ_WRITE_TOKEN",
    expectedStoreId: "store_FYsZWRl3jhb4pwv1",
  },
  {
    id: "lean-event-iec",
    label: "iec",
    envKey: "LEAN_EVENT_TENANT_IEC_BLOB_TOKEN",
    expectedStoreId: "store_7bGNqoq2zpBTCU79",
  },
  {
    id: "lean-event-demo",
    label: "demo",
    envKey: "LEAN_EVENT_TENANT_DEMO_BLOB_TOKEN",
    expectedStoreId: "store_vHENpsMK4FzAgyE5",
  },
];

/** Path prefixes that hold domain JSON already represented on typed Neon tables. */
const TYPED_JSON_PREFIXES = [
  "lean-event/events/",
  "lean-event/contacts/",
  "lean-event/venues/",
  "lean-event/suppliers/",
  "lean-event/clients/",
  "lean-event/assignments/",
  "lean-event/event-assignments/",
  "lean-event/workspaces/",
  "lean-event/versions/",
  "lean-event/entity-versions/",
  "lean-event/notifications/",
  "lean-event/config/",
];

/** Path prefixes that hold real binary files to migrate into document chunks. */
const BINARY_PREFIXES = [
  "lean-event/documents/",
  "lean-event/travel-docs/",
  "lean-event/supplier-documents/",
  "lean-event/event-chat/",
  "lean-event/venue-covers/",
];

const TEMP_HINTS = ["/tmp/", "/.tmp/", "/temp/", "/cache/", "/__tmp"];

function tokenOk(v) {
  return typeof v === "string" && /^vercel_blob_rw_/.test(v) && v.length >= 40;
}

function tenantFromPath(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  // lean-event/<collection>/<tenantId>/...
  if (parts[0] === "lean-event" && parts.length >= 3) {
    return parts[2];
  }
  return null;
}

function collectionFromPath(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "lean-event" && parts.length >= 2) return parts[1];
  return parts[0] || "unknown";
}

function classify(pathname, size) {
  const lower = pathname.toLowerCase();
  if (TEMP_HINTS.some((h) => lower.includes(h))) {
    return { class: "temporary", migrate: false, reason: "temp/cache path hint" };
  }
  if (pathname.startsWith("lean-event/backups/")) {
    return {
      class: "temporary",
      migrate: false,
      reason: "ops backup manifest — not a domain binary",
    };
  }
  if (pathname.startsWith("lean-event/exports/")) {
    return {
      class: "temporary",
      migrate: false,
      reason: "tenant export snapshot JSON — not document BYTEA",
    };
  }
  if (pathname.endsWith(".json")) {
    const typed = TYPED_JSON_PREFIXES.some((p) => pathname.startsWith(p));
    // Chat JSON mirrors Neon entities (event_chat / teresa_chat) — never BYTEA
    if (
      pathname.startsWith("lean-event/event-chats/") ||
      pathname.startsWith("lean-event/teresa-chats/")
    ) {
      return {
        class: "legacy_json_typed",
        migrate: false,
        reason: "chat JSON represented on Neon entities — do not BYTEA",
      };
    }
    return {
      class: typed ? "legacy_json_typed" : "legacy_json_untyped",
      migrate: false,
      reason: typed
        ? "JSON already represented on typed Neon tables — do not BYTEA"
        : "JSON outside known typed collections — skip BYTEA; review separately",
    };
  }
  if (BINARY_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (!size || size <= 0) {
      return { class: "empty_binary", migrate: false, reason: "zero-byte file" };
    }
    return {
      class: "binary_migrate",
      migrate: true,
      reason: "real binary under known document prefixes",
    };
  }
  // Non-json, unknown prefix
  if (size > 0) {
    return {
      class: "unrecognized",
      migrate: false,
      reason: "binary-like object outside known prefixes — manual review",
    };
  }
  return { class: "orphan_empty", migrate: false, reason: "empty unrecognized path" };
}

async function listStore(token) {
  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix: "", cursor, limit: 1000, token });
    for (const b of page.blobs || []) {
      if (b.pathname.endsWith("/")) continue;
      blobs.push({
        pathname: b.pathname,
        size: b.size ?? 0,
        contentType: b.contentType || null,
        uploadedAt: b.uploadedAt ? String(b.uploadedAt) : null,
        url: b.url || null,
      });
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

function fingerprint(items) {
  const h = createHash("sha256");
  for (const it of items) {
    h.update(`${it.pathname}|${it.size}|${it.contentType || ""}\n`);
  }
  return h.digest("hex");
}

const report = {
  generatedAt: new Date().toISOString(),
  blobNotDeleted: true,
  stores: [],
  totals: {
    objects: 0,
    byClass: {},
    byTenant: {},
    migrateCandidates: 0,
  },
};

for (const store of STORES) {
  const resolved = resolveToken(store);
  const token = resolved.token;
  const entry = {
    storeId: store.id,
    label: store.label,
    envKey: store.envKey,
    expectedStoreId: store.expectedStoreId || null,
    tokenPresent: tokenOk(token),
    tokenSource: resolved.source,
    objects: [],
    counts: { total: 0, byClass: {}, byTenant: {}, byCollection: {} },
    error: null,
    notes: [],
  };

  if (!entry.tokenPresent) {
    entry.error = "TOKEN_MISSING_OR_INVALID";
    report.stores.push(entry);
    console.log(`STORE=${store.id} STATUS=no_token`);
    continue;
  }

  try {
    console.log(`STORE=${store.id} TOKEN_SOURCE=${resolved.source}`);
    const blobs = await listStore(token);
    entry.counts.total = blobs.length;
    report.totals.objects += blobs.length;

    // Detect duplicates by pathname within store (should be unique) and size+name across
    const byPath = new Map();
    const bySizeName = new Map();

    for (const blob of blobs) {
      const tenantId = tenantFromPath(blob.pathname);
      const collection = collectionFromPath(blob.pathname);
      const { class: cls, migrate, reason } = classify(blob.pathname, blob.size);
      const base = blob.pathname.split("/").pop() || "";
      const sizeNameKey = `${blob.size}::${base}`;

      const dupPath = byPath.has(blob.pathname);
      byPath.set(blob.pathname, (byPath.get(blob.pathname) || 0) + 1);
      bySizeName.set(sizeNameKey, (bySizeName.get(sizeNameKey) || 0) + 1);

      const item = {
        pathname: blob.pathname,
        size: blob.size,
        contentType: blob.contentType,
        uploadedAt: blob.uploadedAt,
        tenantId,
        collection,
        class: cls,
        migrate,
        reason,
        duplicatePath: dupPath,
        possibleContentDuplicate: false, // filled in second pass
      };
      entry.objects.push(item);

      entry.counts.byClass[cls] = (entry.counts.byClass[cls] || 0) + 1;
      entry.counts.byCollection[collection] =
        (entry.counts.byCollection[collection] || 0) + 1;
      const tKey = tenantId || "(none)";
      entry.counts.byTenant[tKey] = (entry.counts.byTenant[tKey] || 0) + 1;

      report.totals.byClass[cls] = (report.totals.byClass[cls] || 0) + 1;
      report.totals.byTenant[tKey] = (report.totals.byTenant[tKey] || 0) + 1;
      if (migrate) report.totals.migrateCandidates += 1;
    }

    for (const item of entry.objects) {
      const base = item.pathname.split("/").pop() || "";
      const sizeNameKey = `${item.size}::${base}`;
      item.possibleContentDuplicate = (bySizeName.get(sizeNameKey) || 0) > 1;
      if (item.duplicatePath || item.possibleContentDuplicate) {
        if (item.class === "binary_migrate") {
          // keep migrate true; migrator is idempotent via ledger
        } else if (!item.class.startsWith("legacy_json")) {
          item.class =
            item.class === "unrecognized" ? "duplicate_unrecognized" : item.class;
        }
      }
    }

    entry.inventoryFingerprint = fingerprint(entry.objects);
    if (
      store.id === "leanme-event" &&
      entry.counts.total === 0 &&
      resolved.source &&
      (resolved.source.includes("DEMO") ||
        process.env.LEAN_EVENT_LEGACY_BLOB_TOKEN?.trim() ===
          process.env.LEAN_EVENT_TENANT_DEMO_BLOB_TOKEN?.trim() ||
        process.env.BLOB_READ_WRITE_TOKEN?.trim() ===
          process.env.LEAN_EVENT_TENANT_DEMO_BLOB_TOKEN?.trim())
    ) {
      entry.notes.push(
        "LIKELY_WRONG_TOKEN: token equals demo store; set LEAN_EVENT_LEGACY_BLOB_TOKEN from Vercel dashboard store leanme-event"
      );
    }
    console.log(
      `STORE=${store.id} TOTAL=${entry.counts.total} MIGRATE=${entry.objects.filter((o) => o.migrate).length} JSON=${entry.objects.filter((o) => o.class.startsWith("legacy_json")).length}`
    );
    console.log(`  byClass=${JSON.stringify(entry.counts.byClass)}`);
    console.log(`  byTenant=${JSON.stringify(entry.counts.byTenant)}`);
    if (entry.notes.length) console.log(`  notes=${entry.notes.join(" | ")}`);
  } catch (error) {
    entry.error = error instanceof Error ? error.message : String(error);
    console.log(`STORE=${store.id} STATUS=error MSG=${entry.error}`);
  }

  report.stores.push(entry);
}

// Cross-store orphans: path present only in one store among overlapping tenants
const pathToStores = new Map();
for (const store of report.stores) {
  for (const obj of store.objects || []) {
    const arr = pathToStores.get(obj.pathname) || [];
    arr.push(store.storeId);
    pathToStores.set(obj.pathname, arr);
  }
}
let orphanCount = 0;
for (const store of report.stores) {
  for (const obj of store.objects || []) {
    const stores = pathToStores.get(obj.pathname) || [];
    // Orphan = binary under tenant prefix but tenant store empty / path only on legacy
    obj.stores = stores;
    if (
      obj.migrate &&
      stores.length === 1 &&
      stores[0] === "leanme-event" &&
      obj.tenantId
    ) {
      obj.orphanOnLegacy = true;
      orphanCount += 1;
    }
  }
}
report.totals.orphanOnLegacyOnly = orphanCount;

mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
console.log(`INVENTORY_WRITTEN=${outPath}`);
console.log(`BLOB_NOT_DELETED=yes`);
console.log(`MIGRATE_CANDIDATES=${report.totals.migrateCandidates}`);
console.log(`TOTAL_OBJECTS=${report.totals.objects}`);
