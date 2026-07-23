/**
 * Migrate binary files from legacy Vercel Blob → Postgres document chunks.
 * Does NOT delete Blob objects or tokens.
 *
 * Usage:
 *   node --env-file=.env.local scripts/migrate-blob-documents-to-postgres.mjs demo [--dry]
 *   node --env-file=.env.local scripts/migrate-blob-documents-to-postgres.mjs --tenant=demo --dry-run
 */
import { createHash, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { list, get } from "@vercel/blob";

const args = process.argv.slice(2);
const tenantFlag = args.find((a) => a.startsWith("--tenant="));
const tenantId =
  tenantFlag?.slice("--tenant=".length) ||
  args.find((a) => !a.startsWith("--"));
const dry =
  args.includes("--dry") ||
  args.includes("--dry-run") ||
  args.includes("--dryrun");
const prefixArg = args.find((a) => a.startsWith("--prefix="));
const rootPrefix = prefixArg?.slice("--prefix=".length) || "lean-event/";

if (!tenantId) {
  console.error(
    "Usage: node --env-file=.env.local scripts/migrate-blob-documents-to-postgres.mjs <tenantId> [--dry|--dry-run]"
  );
  process.exit(1);
}

const slug = tenantId.toUpperCase().replace(/[^A-Z0-9]/g, "_");
const dbUrl =
  process.env[`LEAN_EVENT_TENANT_${slug}_DATABASE_URL`]?.trim() ||
  process.env.LEAN_EVENT_DATABASE_URL?.trim();
const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();

if (!dbUrl) {
  console.error("FAIL: tenant/legacy DATABASE_URL missing");
  process.exit(2);
}
if (!blobToken || !/^vercel_blob_rw_/.test(blobToken)) {
  console.error(
    "FAIL: BLOB_READ_WRITE_TOKEN missing/invalid (needed as legacy read source only)"
  );
  process.exit(2);
}

const sql = neon(dbUrl);
const CHUNK = 512 * 1024;

const BINARY_PREFIXES = [
  `${rootPrefix}documents/${tenantId}/`,
  `${rootPrefix}travel-docs/${tenantId}/`,
  `${rootPrefix}supplier-documents/${tenantId}/`,
  `${rootPrefix}event-chat/${tenantId}/`,
  `${rootPrefix}venue-covers/${tenantId}/`,
];

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function guessKind(pathname) {
  if (pathname.includes("/travel-docs/")) return "travel_id";
  if (pathname.includes("/supplier-documents/")) return "supplier_agreement";
  if (pathname.includes("/venue-covers/")) return "other";
  if (pathname.includes("/event-chat/")) return "other";
  if (pathname.includes("/documents/")) {
    const parts = pathname.split("/");
    const kindIdx = parts.indexOf("documents") + 2; // tenant then kind
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

function filenameFromPath(pathname) {
  const base = pathname.split("/").pop() || "file.bin";
  return base.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 180) || "file.bin";
}

async function listAll(prefix) {
  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix, cursor, limit: 1000, token: blobToken });
    blobs.push(...(page.blobs || []).filter((b) => !b.pathname.endsWith("/")));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

async function readBlob(pathname) {
  const result = await get(pathname, {
    access: "private",
    useCache: false,
    token: blobToken,
  });
  if (!result?.stream) {
    throw new Error("empty stream");
  }
  return Buffer.from(await new Response(result.stream).arrayBuffer());
}

let pending = 0;
let done = 0;
let skipped = 0;
let failed = 0;

console.log(`TENANT=${tenantId}`);
console.log(`MODE=${dry ? "dry" : "write"}`);

for (const prefix of BINARY_PREFIXES) {
  let blobs = [];
  try {
    blobs = await listAll(prefix);
  } catch (error) {
    console.log(
      `PREFIX_ERR=${prefix} ${error instanceof Error ? error.message : String(error)}`
    );
    continue;
  }
  console.log(`PREFIX=${prefix} count=${blobs.length}`);

  for (const blob of blobs) {
    const pathname = blob.pathname;
    // Skip JSON entity dumps — domain data must go to typed tables, not chunks
    if (pathname.endsWith(".json")) {
      skipped += 1;
      continue;
    }

    pending += 1;
    try {
      const existing = await sql`
        SELECT status, document_id, sha256
        FROM lean_event_blob_migration_ledger
        WHERE tenant_id = ${tenantId} AND legacy_path = ${pathname}
        LIMIT 1
      `;
      if (existing[0]?.status === "done") {
        skipped += 1;
        continue;
      }

      const bytes = await readBlob(pathname);
      if (bytes.byteLength === 0) {
        await sql`
          INSERT INTO lean_event_blob_migration_ledger (
            tenant_id, legacy_path, status, error, migrated_at
          ) VALUES (
            ${tenantId}, ${pathname}, ${"skipped"}, ${"empty file"}, now()
          )
          ON CONFLICT (tenant_id, legacy_path) DO UPDATE SET
            status = EXCLUDED.status, error = EXCLUDED.error, migrated_at = now()
        `;
        skipped += 1;
        continue;
      }

      const digest = sha256(bytes);
      if (dry) {
        console.log(`DRY ${pathname} bytes=${bytes.byteLength} sha=${digest.slice(0, 12)}`);
        done += 1;
        continue;
      }

      const documentId = randomUUID();
      const versionId = randomUUID();
      const now = new Date().toISOString();
      const filename = filenameFromPath(pathname);
      const kind = guessKind(pathname);
      const mime = blob.contentType || "application/octet-stream";
      const chunks = [];
      for (let i = 0; i < bytes.byteLength; i += CHUNK) {
        chunks.push(bytes.subarray(i, i + CHUNK));
      }

      await sql`
        INSERT INTO lean_event_documents (
          id, tenant_id, kind, status, title, filename, mime, bytes, sha256,
          blob_path, revision, current_version, legal_hold, retention_class,
          created_at, updated_at, created_by, updated_by, meta
        ) VALUES (
          ${documentId}, ${tenantId}, ${kind}, ${"ready"}, ${filename},
          ${filename}, ${mime}, ${bytes.byteLength}, ${digest},
          ${pathname}, ${1}, ${1}, ${false}, ${"standard"},
          ${now}::timestamptz, ${now}::timestamptz, ${"migration"}, ${"migration"},
          ${JSON.stringify({ legacyBlobPath: pathname })}::jsonb
        )
      `;

      await sql`
        INSERT INTO lean_event_document_versions (
          tenant_id, id, document_id, version, filename, mime, bytes, sha256,
          compression, chunk_count, chunk_size, created_at, created_by, source, note
        ) VALUES (
          ${tenantId}, ${versionId}, ${documentId}, ${1}, ${filename}, ${mime},
          ${bytes.byteLength}, ${digest}, ${"none"}, ${chunks.length}, ${CHUNK},
          ${now}::timestamptz, ${"migration"}, ${"migration"}, ${"blob legacy import"}
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

      // integrity verify
      const verifyRows = await sql`
        SELECT payload FROM lean_event_document_chunks
        WHERE tenant_id = ${tenantId} AND version_id = ${versionId}
        ORDER BY chunk_index ASC
      `;
      const rebuilt = Buffer.concat(
        verifyRows.map((r) => {
          const p = r.payload;
          if (Buffer.isBuffer(p)) return p;
          if (typeof p === "string" && p.startsWith("\\x")) {
            return Buffer.from(p.slice(2), "hex");
          }
          return Buffer.from(p);
        })
      );
      if (sha256(rebuilt) !== digest) {
        throw new Error("post-insert hash mismatch");
      }

      await sql`
        INSERT INTO lean_event_blob_migration_ledger (
          tenant_id, legacy_path, document_id, version_id, sha256, bytes, status, migrated_at
        ) VALUES (
          ${tenantId}, ${pathname}, ${documentId}, ${versionId}, ${digest},
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
      done += 1;
    } catch (error) {
      failed += 1;
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`FAIL ${pathname}: ${msg}`);
      if (!dry) {
        await sql`
          INSERT INTO lean_event_blob_migration_ledger (
            tenant_id, legacy_path, status, error, migrated_at
          ) VALUES (
            ${tenantId}, ${pathname}, ${"failed"}, ${msg.slice(0, 500)}, now()
          )
          ON CONFLICT (tenant_id, legacy_path) DO UPDATE SET
            status = EXCLUDED.status, error = EXCLUDED.error, migrated_at = now()
        `;
      }
    }
  }
}

console.log(`SCANNED=${pending}`);
console.log(`DONE=${done}`);
console.log(`SKIPPED=${skipped}`);
console.log(`FAILED=${failed}`);
console.log(failed === 0 ? "MIGRATE_BLOB_DOCS_OK" : "MIGRATE_BLOB_DOCS_PARTIAL");
console.log("BLOB_NOT_DELETED=yes");
process.exit(failed === 0 ? 0 : 1);
