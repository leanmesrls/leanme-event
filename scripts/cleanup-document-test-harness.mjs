/**
 * Remove demo DB documents clearly created by the test harness
 * (created_by = 'test', kind/other sample.bin / soft-delete-doc patterns).
 * Never touches Blob.
 *
 * Usage: node --env-file=.env.local scripts/cleanup-document-test-harness.mjs [--write]
 */
import { neon } from "@neondatabase/serverless";

const dry = !process.argv.includes("--write");
const url = process.env.LEAN_EVENT_TENANT_DEMO_DATABASE_URL?.trim();
if (!url) {
  console.error("FAIL: LEAN_EVENT_TENANT_DEMO_DATABASE_URL missing");
  process.exit(2);
}

const sql = neon(url);

const candidates = await sql`
  SELECT id, filename, created_by, bytes, sha256, current_version, deleted_at
  FROM lean_event_documents
  WHERE tenant_id = ${"demo"}
    AND created_by = ${"test"}
    AND (
      filename IN ('sample.bin', 'sample2.bin')
      OR filename LIKE 'sample%'
      OR meta->>'harness' = 'true'
    )
`;

// Also match soft-delete harness content by known test filenames from insertDoc
const byContent = await sql`
  SELECT id, filename, created_by, bytes, sha256, current_version, deleted_at
  FROM lean_event_documents
  WHERE tenant_id = ${"demo"}
    AND (
      created_by = ${"test"}
      OR created_by = ${"smoke"}
      OR meta->>'harness' = 'true'
      OR meta->>'smoke' = 'true'
    )
`;

const ids = new Set([
  ...candidates.map((r) => r.id),
  ...byContent.map((r) => r.id),
]);

console.log(`CANDIDATES=${ids.size}`);
for (const row of [...candidates, ...byContent]) {
  console.log(
    `  ${row.id} file=${row.filename} by=${row.created_by} bytes=${row.bytes} deleted=${Boolean(row.deleted_at)}`
  );
}

if (dry) {
  console.log("MODE=dry (pass --write to purge via lean_event.allow_doc_purge)");
  console.log("BLOB_NOT_DELETED=yes");
  process.exit(0);
}

let purged = 0;
for (const id of ids) {
  await sql`
    UPDATE lean_event_documents
    SET legal_hold = FALSE,
        deleted_at = COALESCE(deleted_at, now()),
        purge_after = now() - interval '1 day'
    WHERE tenant_id = ${"demo"} AND id = ${id}
  `;
  const ok = await sql`SELECT lean_event_purge_document(${"demo"}, ${id}) AS ok`;
  if (ok[0]?.ok) purged += 1;
}
console.log(`PURGED=${purged}`);
console.log(`BLOB_NOT_DELETED=yes`);
