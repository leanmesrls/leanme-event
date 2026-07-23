/**
 * Post-migration verification: ledger, counts, hash rebuild sample.
 * Usage: node --env-file=.env.local scripts/verify-blob-doc-cutover.mjs [tenantId]
 */
import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const tenantId = process.argv[2] || "demo";
const slug = tenantId.toUpperCase().replace(/[^A-Z0-9]/g, "_");
const url =
  process.env[`LEAN_EVENT_TENANT_${slug}_DATABASE_URL`]?.trim() ||
  process.env.LEAN_EVENT_DATABASE_URL?.trim();
if (!url) {
  console.error("FAIL: DATABASE_URL missing");
  process.exit(2);
}

const sql = neon(url);

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function decode(p) {
  if (Buffer.isBuffer(p)) return p;
  if (typeof p === "string" && p.startsWith("\\x")) return Buffer.from(p.slice(2), "hex");
  return Buffer.from(p);
}

const counts = await sql`
  SELECT
    (SELECT COUNT(*)::int FROM lean_event_documents WHERE tenant_id = ${tenantId}) AS docs,
    (SELECT COUNT(*)::int FROM lean_event_document_versions WHERE tenant_id = ${tenantId}) AS versions,
    (SELECT COUNT(*)::int FROM lean_event_document_chunks WHERE tenant_id = ${tenantId}) AS chunks
`;

const ledger = await sql`
  SELECT status, COUNT(*)::int AS n
  FROM lean_event_blob_migration_ledger
  WHERE tenant_id = ${tenantId}
  GROUP BY status
  ORDER BY status
`;

const done = await sql`
  SELECT legacy_path, document_id, version_id, sha256, bytes, status
  FROM lean_event_blob_migration_ledger
  WHERE tenant_id = ${tenantId} AND status = ${"done"}
  ORDER BY migrated_at
`;

let hashOk = 0;
let hashFail = 0;
for (const row of done) {
  const chunks = await sql`
    SELECT payload FROM lean_event_document_chunks
    WHERE tenant_id = ${tenantId} AND version_id = ${row.version_id}
    ORDER BY chunk_index ASC
  `;
  const rebuilt = Buffer.concat(chunks.map((c) => decode(c.payload)));
  const dig = sha256(rebuilt);
  if (dig === row.sha256 && rebuilt.byteLength === Number(row.bytes)) hashOk += 1;
  else hashFail += 1;
}

console.log(`TENANT=${tenantId}`);
console.log(`DOCS=${counts[0].docs} VERSIONS=${counts[0].versions} CHUNKS=${counts[0].chunks}`);
console.log(`LEDGER=${JSON.stringify(Object.fromEntries(ledger.map((r) => [r.status, r.n])))}`);
console.log(`DONE_ROWS=${done.length}`);
console.log(`HASH_REBUILD_OK=${hashOk}`);
console.log(`HASH_REBUILD_FAIL=${hashFail}`);
console.log(`BLOB_NOT_DELETED=yes`);
if (hashFail > 0) process.exitCode = 2;
