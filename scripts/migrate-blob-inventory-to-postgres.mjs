/**
 * Controlled cutover: migrate classified binary Blob objects → Postgres chunks.
 * Never deletes or modifies Blob objects.
 *
 * Usage:
 *   node --env-file=.env.local scripts/migrate-blob-inventory-to-postgres.mjs --inventory=tmp/blob-inventory.json
 *   node --env-file=.env.local scripts/migrate-blob-inventory-to-postgres.mjs --inventory=... --dry-run
 *   node --env-file=.env.local scripts/migrate-blob-inventory-to-postgres.mjs --inventory=... --write
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { get } from "@vercel/blob";

const args = process.argv.slice(2);
const invArg = args.find((a) => a.startsWith("--inventory="));
const dry = args.includes("--dry-run") || args.includes("--dry") || !args.includes("--write");
const inventoryPath = invArg?.slice("--inventory=".length);
if (!inventoryPath) {
  console.error("Usage: ... --inventory=tmp/blob-inventory.json [--dry-run|--write]");
  process.exit(1);
}

const CHUNK = 512 * 1024;
const inventory = JSON.parse(readFileSync(inventoryPath, "utf8"));

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function dbUrlForTenant(tenantId) {
  const slug = String(tenantId || "").toUpperCase().replace(/[^A-Z0-9]/g, "_");
  return (
    process.env[`LEAN_EVENT_TENANT_${slug}_DATABASE_URL`]?.trim() ||
    process.env.LEAN_EVENT_DATABASE_URL?.trim() ||
    null
  );
}

function guessKind(pathname) {
  if (pathname.includes("/travel-docs/")) return "travel_id";
  if (pathname.includes("/supplier-documents/")) return "supplier_agreement";
  if (pathname.includes("/venue-covers/")) return "other";
  if (pathname.includes("/event-chat/")) return "other";
  if (pathname.includes("/documents/")) {
    const parts = pathname.split("/");
    const kindIdx = parts.indexOf("documents") + 2;
    const kind = parts[kindIdx];
    const known = new Set([
      "cv",
      "faculty_pack",
      "attestato_partecipazione",
      "certificazione_ecm",
      "agenas",
      "travel_id",
      "supplier_agreement",
      "other",
    ]);
    if (known.has(kind)) return kind;
  }
  return "other";
}

function parseDomainLinks(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  // lean-event/documents/<tenant>/<kind>/<personId?>/<file>
  // lean-event/travel-docs/<tenant>/<eventId>/<assignmentId>/<file>
  // lean-event/supplier-documents/<tenant>/<scope>/<scopeId>/<file>
  // lean-event/event-chat/<tenant>/<eventId>/<file>
  // lean-event/venue-covers/<tenant>/<venueId>.ext
  const out = {
    eventId: null,
    personId: null,
    supplierId: null,
    workspaceId: null,
    venueId: null,
    assignmentId: null,
  };
  const col = parts[1];
  if (col === "travel-docs" && parts.length >= 5) {
    out.eventId = parts[3];
    out.assignmentId = parts[4];
  } else if (col === "event-chat" && parts.length >= 4) {
    out.eventId = parts[3];
  } else if (col === "supplier-documents" && parts.length >= 5) {
    if (parts[3] === "rubrica") out.supplierId = parts[4];
    if (parts[3] === "event") {
      const [eventId] = String(parts[4]).split("__");
      out.eventId = eventId || null;
    }
  } else if (col === "venue-covers" && parts.length >= 4) {
    out.venueId = parts[3].replace(/\.[^.]+$/, "");
  } else if (col === "documents" && parts.length >= 5) {
    const maybeId = parts[4];
    if (/^[0-9a-f-]{36}$/i.test(maybeId)) out.personId = maybeId;
  }
  return out;
}

function filenameFromPath(pathname) {
  const base = pathname.split("/").pop() || "file.bin";
  return base.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 180) || "file.bin";
}

function tokenForStore(storeId, envKey) {
  const t = process.env[envKey]?.trim();
  if (t && /^vercel_blob_rw_/.test(t)) return t;
  if (storeId === "leanme-event") {
    const legacy = process.env.LEAN_EVENT_LEGACY_BLOB_TOKEN?.trim();
    if (legacy && /^vercel_blob_rw_/.test(legacy)) return legacy;
  }
  const fallback = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (fallback && /^vercel_blob_rw_/.test(fallback)) return fallback;
  return null;
}

async function readBlob(pathname, token) {
  const result = await get(pathname, {
    access: "private",
    useCache: false,
    token,
  });
  if (!result?.stream) throw new Error("empty stream");
  return Buffer.from(await new Response(result.stream).arrayBuffer());
}

function decodePayload(p) {
  if (Buffer.isBuffer(p)) return p;
  if (typeof p === "string" && p.startsWith("\\x")) return Buffer.from(p.slice(2), "hex");
  return Buffer.from(p);
}

const summary = {
  mode: dry ? "dry" : "write",
  blobNotDeleted: true,
  migrated: [],
  skipped: [],
  failed: [],
  duplicates: [],
  orphans: [],
  before: {},
  after: {},
  shaVerified: 0,
  shaFailed: 0,
};

async function counts(sql, tenantId) {
  const rows = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM lean_event_documents WHERE tenant_id = ${tenantId}) AS docs,
      (SELECT COUNT(*)::int FROM lean_event_document_versions WHERE tenant_id = ${tenantId}) AS versions,
      (SELECT COUNT(*)::int FROM lean_event_document_chunks WHERE tenant_id = ${tenantId}) AS chunks,
      (SELECT COUNT(*)::int FROM lean_event_blob_migration_ledger WHERE tenant_id = ${tenantId}) AS ledger
  `;
  return rows[0];
}

const sqlCache = new Map();
function sqlFor(tenantId) {
  if (sqlCache.has(tenantId)) return sqlCache.get(tenantId);
  const url = dbUrlForTenant(tenantId);
  if (!url) return null;
  const sql = neon(url);
  sqlCache.set(tenantId, sql);
  return sql;
}

for (const store of inventory.stores || []) {
  if (!store.tokenPresent || store.error) {
    summary.skipped.push({
      store: store.storeId,
      reason: store.error || "no token",
    });
    continue;
  }
  const token = tokenForStore(store.storeId, store.envKey);
  if (!token) {
    summary.skipped.push({ store: store.storeId, reason: "token resolve failed" });
    continue;
  }

  for (const obj of store.objects || []) {
    if (obj.orphanOnLegacy) {
      summary.orphans.push({
        store: store.storeId,
        pathname: obj.pathname,
        tenantId: obj.tenantId,
      });
    }
    if (obj.possibleContentDuplicate) {
      summary.duplicates.push({
        store: store.storeId,
        pathname: obj.pathname,
        size: obj.size,
      });
    }

    if (!obj.migrate) {
      summary.skipped.push({
        store: store.storeId,
        pathname: obj.pathname,
        class: obj.class,
        reason: obj.reason,
      });
      continue;
    }

    const tenantId = obj.tenantId;
    if (!tenantId) {
      summary.failed.push({
        pathname: obj.pathname,
        error: "tenant_unresolved",
      });
      continue;
    }

    const sql = sqlFor(tenantId);
    if (!sql) {
      summary.failed.push({
        pathname: obj.pathname,
        tenantId,
        error: "DATABASE_URL_MISSING",
      });
      continue;
    }

    if (!summary.before[tenantId]) {
      summary.before[tenantId] = await counts(sql, tenantId);
    }

    try {
      const existing = await sql`
        SELECT status, document_id, sha256, version_id
        FROM lean_event_blob_migration_ledger
        WHERE tenant_id = ${tenantId} AND legacy_path = ${obj.pathname}
        LIMIT 1
      `;
      if (existing[0]?.status === "done") {
        summary.skipped.push({
          store: store.storeId,
          pathname: obj.pathname,
          class: obj.class,
          reason: "already migrated (ledger done)",
        });
        continue;
      }

      const bytes = await readBlob(obj.pathname, token);
      const digestBefore = sha256(bytes);
      if (bytes.byteLength === 0) {
        if (!dry) {
          await sql`
            INSERT INTO lean_event_blob_migration_ledger (
              tenant_id, legacy_path, status, error, migrated_at
            ) VALUES (
              ${tenantId}, ${obj.pathname}, ${"skipped"}, ${"empty file"}, now()
            )
            ON CONFLICT (tenant_id, legacy_path) DO UPDATE SET
              status = EXCLUDED.status, error = EXCLUDED.error, migrated_at = now()
          `;
        }
        summary.skipped.push({
          pathname: obj.pathname,
          reason: "empty file",
        });
        continue;
      }

      if (dry) {
        summary.migrated.push({
          dry: true,
          store: store.storeId,
          pathname: obj.pathname,
          tenantId,
          bytes: bytes.byteLength,
          sha256: digestBefore,
          kind: guessKind(obj.pathname),
          links: parseDomainLinks(obj.pathname),
        });
        continue;
      }

      const documentId = randomUUID();
      const versionId = randomUUID();
      const now = new Date().toISOString();
      const filename = filenameFromPath(obj.pathname);
      const kind = guessKind(obj.pathname);
      const mime = obj.contentType || "application/octet-stream";
      const links = parseDomainLinks(obj.pathname);
      const chunks = [];
      for (let i = 0; i < bytes.byteLength; i += CHUNK) {
        chunks.push(bytes.subarray(i, i + CHUNK));
      }

      const meta = {
        legacyBlobPath: obj.pathname,
        legacyStore: store.storeId,
        migrationSource: "inventory-cutover",
        links,
      };

      await sql`
        INSERT INTO lean_event_documents (
          id, tenant_id, kind, status, title, filename, mime, bytes, sha256,
          blob_path, event_id, person_id, assignment_id, supplier_id, workspace_id,
          revision, current_version, legal_hold, retention_class,
          created_at, updated_at, created_by, updated_by, meta
        ) VALUES (
          ${documentId}, ${tenantId}, ${kind}, ${"ready"}, ${filename},
          ${filename}, ${mime}, ${bytes.byteLength}, ${digestBefore},
          ${obj.pathname}, ${links.eventId}, ${links.personId}, ${links.assignmentId},
          ${links.supplierId}, ${links.workspaceId},
          ${1}, ${1}, ${false}, ${"standard"},
          ${now}::timestamptz, ${now}::timestamptz, ${"migration"}, ${"migration"},
          ${JSON.stringify(meta)}::jsonb
        )
      `;

      await sql`
        INSERT INTO lean_event_document_versions (
          tenant_id, id, document_id, version, filename, mime, bytes, sha256,
          compression, chunk_count, chunk_size, created_at, created_by, source, note
        ) VALUES (
          ${tenantId}, ${versionId}, ${documentId}, ${1}, ${filename}, ${mime},
          ${bytes.byteLength}, ${digestBefore}, ${"none"}, ${chunks.length}, ${CHUNK},
          ${now}::timestamptz, ${"migration"}, ${"migration"}, ${"blob inventory cutover"}
        )
      `;

      for (let index = 0; index < chunks.length; index += 1) {
        const chunk = chunks[index];
        await sql`
          INSERT INTO lean_event_document_chunks (
            tenant_id, version_id, chunk_index, bytes, sha256, payload
          ) VALUES (
            ${tenantId}, ${versionId}, ${index}, ${chunk.byteLength},
            ${sha256(chunk)}, ${chunk}
          )
        `;
      }

      const verifyRows = await sql`
        SELECT payload FROM lean_event_document_chunks
        WHERE tenant_id = ${tenantId} AND version_id = ${versionId}
        ORDER BY chunk_index ASC
      `;
      const rebuilt = Buffer.concat(verifyRows.map((r) => decodePayload(r.payload)));
      const digestAfter = sha256(rebuilt);
      if (digestAfter !== digestBefore) {
        summary.shaFailed += 1;
        throw new Error("post-insert hash mismatch");
      }
      summary.shaVerified += 1;

      await sql`
        INSERT INTO lean_event_blob_migration_ledger (
          tenant_id, legacy_path, document_id, version_id, sha256, bytes, status, migrated_at
        ) VALUES (
          ${tenantId}, ${obj.pathname}, ${documentId}, ${versionId}, ${digestBefore},
          ${bytes.byteLength}, ${"done"}, now()
        )
        ON CONFLICT (tenant_id, legacy_path) DO UPDATE SET
          document_id = EXCLUDED.document_id,
          version_id = EXCLUDED.version_id,
          sha256 = EXCLUDED.sha256,
          bytes = EXCLUDED.bytes,
          status = EXCLUDED.status,
          error = NULL,
          migrated_at = now()
      `;

      summary.migrated.push({
        store: store.storeId,
        pathname: obj.pathname,
        tenantId,
        documentId,
        versionId,
        bytes: bytes.byteLength,
        sha256: digestBefore,
        kind,
        links,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      summary.failed.push({
        store: store.storeId,
        pathname: obj.pathname,
        tenantId,
        error: msg,
      });
      if (!dry) {
        try {
          await sql`
            INSERT INTO lean_event_blob_migration_ledger (
              tenant_id, legacy_path, status, error, migrated_at
            ) VALUES (
              ${tenantId}, ${obj.pathname}, ${"failed"}, ${msg.slice(0, 500)}, now()
            )
            ON CONFLICT (tenant_id, legacy_path) DO UPDATE SET
              status = EXCLUDED.status, error = EXCLUDED.error, migrated_at = now()
          `;
        } catch {
          // ignore secondary
        }
      }
    }
  }
}

for (const tenantId of Object.keys(summary.before)) {
  const sql = sqlFor(tenantId);
  if (sql) summary.after[tenantId] = await counts(sql, tenantId);
}

const outDir = path.dirname(inventoryPath);
mkdirSync(outDir, { recursive: true });
const outFile = path.join(
  outDir,
  `blob-migration-${dry ? "dry" : "write"}-${Date.now()}.json`
);
writeFileSync(outFile, JSON.stringify(summary, null, 2), "utf8");

console.log(`MODE=${summary.mode}`);
console.log(`MIGRATED=${summary.migrated.length}`);
console.log(`SKIPPED=${summary.skipped.length}`);
console.log(`FAILED=${summary.failed.length}`);
console.log(`DUPLICATES_FLAGGED=${summary.duplicates.length}`);
console.log(`ORPHANS_LEGACY=${summary.orphans.length}`);
console.log(`SHA_VERIFIED=${summary.shaVerified}`);
console.log(`SHA_FAILED=${summary.shaFailed}`);
console.log(`REPORT=${outFile}`);
console.log(`BLOB_NOT_DELETED=yes`);
if (summary.failed.length) process.exitCode = 2;
