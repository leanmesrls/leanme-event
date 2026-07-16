/**
 * Migrazione one-shot: JSON (filesystem locale e/o Vercel Blob) → Neon.
 * Idempotente (UPSERT). Non cancella Blob/FS.
 *
 * Usage:
 *   node scripts/migrate-lean-event-neon.mjs --blob-only
 *   node scripts/migrate-lean-event-neon.mjs --env-file=.env.vercel.pull --blob-only
 * Flags: --dry-run  --blob-only  --fs-only  --env-file=PATH
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { list, get } from "@vercel/blob";
import { neon } from "@neondatabase/serverless";

import { loadEnvFileIntoProcess } from "./load-env-file.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const envFileArg = process.argv.find((a) => a.startsWith("--env-file="));
const envFile = envFileArg
  ? envFileArg.slice("--env-file=".length)
  : path.join(root, ".env.vercel.pull");

loadEnvFileIntoProcess(path.join(root, ".env.local"), { override: false });
loadEnvFileIntoProcess(envFile, { override: true });

const DATA_ROOT =
  process.env.LEAN_EVENT_DATA_DIR?.trim() ||
  process.env.LEANYOU_DATA_DIR?.trim() ||
  path.join(process.cwd(), ".lean-event-data");

const COLLECTIONS = [
  { entityType: "event", fsDir: "events", blobRoot: "lean-event/events" },
  { entityType: "contact", fsDir: "contacts", blobRoot: "lean-event/contacts" },
  {
    entityType: "supplier",
    fsDir: "suppliers",
    blobRoot: "lean-event/suppliers",
  },
  { entityType: "venue", fsDir: "venues", blobRoot: "lean-event/venues" },
  {
    entityType: "assignment",
    fsDir: "event-assignments",
    blobRoot: "lean-event/event-assignments",
  },
  {
    entityType: "workspace",
    fsDir: "workspaces",
    blobRoot: "lean-event/workspaces",
  },
  {
    entityType: "event_supplier_link",
    fsDir: "event-suppliers",
    blobRoot: "lean-event/event-suppliers",
  },
  {
    entityType: "event_chat",
    fsDir: "event-chats",
    blobRoot: "lean-event/event-chats",
  },
];

const dryRun = process.argv.includes("--dry-run");
const blobOnly = process.argv.includes("--blob-only");
const fsOnly = process.argv.includes("--fs-only");
const blobEnabled = Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());

function toIso(value) {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

async function listTenantIdsFromFs() {
  const tenantsPath = path.join(DATA_ROOT, "tenants.json");
  try {
    const raw = await fs.readFile(tenantsPath, "utf8");
    const data = JSON.parse(raw);
    return (data.tenants ?? []).map((t) => t.id);
  } catch {
    const eventsDir = path.join(DATA_ROOT, "events");
    try {
      const entries = await fs.readdir(eventsDir, { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      return [];
    }
  }
}

async function listTenantIdsFromEnv() {
  const json =
    process.env.LEAN_EVENT_TENANTS_JSON?.trim() ||
    process.env.LEANYOU_TENANTS_JSON?.trim();
  if (!json) {
    return [];
  }
  try {
    const data = JSON.parse(json);
    return (data.tenants ?? []).map((t) => t.id);
  } catch {
    return [];
  }
}

async function readFsEntities(tenantId, fsDir) {
  const dir = path.join(DATA_ROOT, fsDir, tenantId);
  let files = [];
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const rows = [];
  for (const file of files) {
    try {
      const raw = await fs.readFile(path.join(dir, file), "utf8");
      const entity = JSON.parse(raw);
      if (entity?.id) {
        rows.push(entity);
      }
    } catch (error) {
      console.warn(`Skip ${dir}/${file}:`, error.message);
    }
  }
  return rows;
}

async function readBlobEntities(tenantId, blobRoot) {
  if (!blobEnabled) {
    return [];
  }
  const prefix = `${blobRoot}/${tenantId}/`;
  const pathnames = [];
  let cursor;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    pathnames.push(
      ...page.blobs
        .map((b) => b.pathname)
        .filter((p) => p.endsWith(".json"))
    );
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  const rows = [];
  for (const pathname of pathnames) {
    try {
      const result = await get(pathname, { access: "private", useCache: false });
      if (!result?.stream) {
        continue;
      }
      const raw = await new Response(result.stream).text();
      const entity = JSON.parse(raw);
      if (entity?.id) {
        rows.push(entity);
      }
    } catch (error) {
      console.warn(`Skip blob ${pathname}:`, error.message);
    }
  }
  return rows;
}

function mergeById(fsRows, blobRows) {
  const map = new Map();
  for (const row of fsRows) {
    map.set(row.id, row);
  }
  for (const row of blobRows) {
    const existing = map.get(row.id);
    if (
      !existing ||
      String(row.updatedAt ?? "").localeCompare(String(existing.updatedAt ?? "")) >
        0
    ) {
      map.set(row.id, row);
    }
  }
  return [...map.values()];
}

async function upsert(sql, entityType, entity) {
  const createdAt = toIso(entity.createdAt) ?? new Date().toISOString();
  const updatedAt = toIso(entity.updatedAt) ?? createdAt;
  const deletedAt = toIso(entity.deletedAt ?? null);
  const purgeAfter = toIso(entity.purgeAfter ?? null);
  const revision = typeof entity.revision === "number" ? entity.revision : 1;

  await sql`
    INSERT INTO lean_event_entities (
      id, tenant_id, entity_type, revision, payload,
      created_at, updated_at, created_by, updated_by,
      deleted_at, deleted_by, purge_after
    ) VALUES (
      ${entity.id},
      ${entity.tenantId},
      ${entityType},
      ${revision},
      ${entity},
      ${createdAt},
      ${updatedAt},
      ${entity.createdBy ?? null},
      ${entity.updatedBy ?? null},
      ${deletedAt},
      ${entity.deletedBy ?? null},
      ${purgeAfter}
    )
    ON CONFLICT (tenant_id, entity_type, id) DO UPDATE SET
      revision = EXCLUDED.revision,
      payload = EXCLUDED.payload,
      updated_at = EXCLUDED.updated_at,
      updated_by = EXCLUDED.updated_by,
      deleted_at = EXCLUDED.deleted_at,
      deleted_by = EXCLUDED.deleted_by,
      purge_after = EXCLUDED.purge_after
  `;
}

async function main() {
  const url = process.env.LEAN_EVENT_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error("Manca LEAN_EVENT_DATABASE_URL");
    process.exit(1);
  }

  console.log(`Data root: ${DATA_ROOT}`);
  console.log(`Blob token: ${blobEnabled ? "presente" : "assente"}`);
  if (!blobEnabled && !fsOnly) {
    console.warn(
      "Attenzione: senza BLOB_READ_WRITE_TOKEN la migrazione Blob è saltata."
    );
  }
  console.log(dryRun ? "Mode: DRY-RUN\n" : "Mode: WRITE\n");

  const sql = dryRun ? null : neon(url);
  const tenantIds = [
    ...new Set([
      ...(await listTenantIdsFromFs()),
      ...(await listTenantIdsFromEnv()),
    ]),
  ];
  if (tenantIds.length === 0) {
    console.log(
      "Nessun tenant trovato (tenants.json / LEAN_EVENT_TENANTS_JSON)."
    );
    return;
  }

  const totals = Object.fromEntries(COLLECTIONS.map((c) => [c.entityType, 0]));

  for (const tenantId of tenantIds) {
    console.log(`Tenant: ${tenantId}`);
    for (const collection of COLLECTIONS) {
      const fsRows = blobOnly
        ? []
        : await readFsEntities(tenantId, collection.fsDir);
      const blobRows =
        fsOnly || !blobEnabled
          ? []
          : await readBlobEntities(tenantId, collection.blobRoot);
      const entities = mergeById(fsRows, blobRows);
      totals[collection.entityType] += entities.length;
      console.log(
        `  ${collection.entityType.padEnd(12)} ${entities.length} (fs ${fsRows.length}, blob ${blobRows.length})`
      );

      if (dryRun || !sql) {
        continue;
      }

      for (const entity of entities) {
        if (!entity.tenantId) {
          entity.tenantId = tenantId;
        }
        await upsert(sql, collection.entityType, entity);
      }
    }
    console.log("");
  }

  console.log("Totale migrato (o conteggiato):");
  for (const [type, n] of Object.entries(totals)) {
    console.log(`  ${type.padEnd(12)} ${n}`);
  }

  if (!dryRun && sql) {
    const count = await sql`SELECT COUNT(*)::int AS n FROM lean_event_entities`;
    console.log(`\nRighe in lean_event_entities: ${count[0].n}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
