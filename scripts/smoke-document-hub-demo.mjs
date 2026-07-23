/**
 * End-to-end smoke: Document Hub + legacy binary helpers on demo Postgres.
 * No Blob access. Cleans up harness docs at the end.
 *
 * Usage: node --env-file=.env.local scripts/smoke-document-hub-demo.mjs
 */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const url = process.env.LEAN_EVENT_TENANT_DEMO_DATABASE_URL?.trim();
if (!url) {
  console.error("FAIL: LEAN_EVENT_TENANT_DEMO_DATABASE_URL missing");
  process.exit(2);
}

const sql = neon(url);
const CHUNK = 512 * 1024;
const tenantId = "demo";

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function decode(p) {
  if (Buffer.isBuffer(p)) return p;
  if (typeof p === "string" && p.startsWith("\\x")) return Buffer.from(p.slice(2), "hex");
  return Buffer.from(p);
}

async function insertBinary(input) {
  const documentId = randomUUID();
  const versionId = randomUUID();
  const now = new Date().toISOString();
  const digest = sha256(input.file);
  const chunks = [];
  for (let i = 0; i < input.file.byteLength; i += CHUNK) {
    chunks.push(input.file.subarray(i, i + CHUNK));
  }

  await sql`
    INSERT INTO lean_event_documents (
      id, tenant_id, kind, status, title, filename, mime, bytes, sha256,
      blob_path, revision, current_version, legal_hold, retention_class,
      person_id, event_id, assignment_id, supplier_id, workspace_id,
      created_at, updated_at, created_by, updated_by, meta
    ) VALUES (
      ${documentId}, ${tenantId}, ${input.kind}, ${"ready"}, ${input.filename},
      ${input.filename}, ${input.mime}, ${input.file.byteLength}, ${digest},
      ${input.legacyPath ?? null}, ${1}, ${1}, ${false}, ${"standard"},
      ${null}, ${input.eventId ?? null}, ${input.assignmentId ?? null},
      ${input.supplierId ?? null}, ${null},
      ${now}::timestamptz, ${now}::timestamptz, ${"smoke"}, ${"smoke"},
      ${JSON.stringify({ harness: true, smoke: true })}::jsonb
    )
  `;
  await sql`
    INSERT INTO lean_event_document_versions (
      tenant_id, id, document_id, version, filename, mime, bytes, sha256,
      compression, chunk_count, chunk_size, created_at, created_by, source, note
    ) VALUES (
      ${tenantId}, ${versionId}, ${documentId}, ${1}, ${input.filename}, ${input.mime},
      ${input.file.byteLength}, ${digest}, ${"none"}, ${chunks.length}, ${CHUNK},
      ${now}::timestamptz, ${"smoke"}, ${"upload"}, ${"smoke e2e"}
    )
  `;
  for (let i = 0; i < chunks.length; i += 1) {
    await sql`
      INSERT INTO lean_event_document_chunks (
        tenant_id, version_id, chunk_index, bytes, sha256, payload
      ) VALUES (
        ${tenantId}, ${versionId}, ${i}, ${chunks[i].byteLength},
        ${sha256(chunks[i])}, ${chunks[i]}
      )
    `;
  }
  return { documentId, versionId, digest };
}

async function readBytes(documentId) {
  const v = await sql`
    SELECT v.id, v.sha256, v.bytes, v.version, v.mime, v.filename, v.chunk_count
    FROM lean_event_document_versions v
    JOIN lean_event_documents d ON d.tenant_id=v.tenant_id AND d.id=v.document_id
    WHERE d.tenant_id=${tenantId} AND d.id=${documentId} AND v.version=d.current_version
    LIMIT 1
  `;
  assert.equal(v.length, 1);
  const chunks = await sql`
    SELECT payload FROM lean_event_document_chunks
    WHERE tenant_id=${tenantId} AND version_id=${v[0].id}
    ORDER BY chunk_index ASC
  `;
  assert.equal(chunks.length, Number(v[0].chunk_count));
  const bytes = Buffer.concat(chunks.map((c) => decode(c.payload)));
  assert.equal(sha256(bytes), v[0].sha256);
  return { bytes, meta: v[0] };
}

const steps = [];
function ok(name) {
  steps.push(`PASS ${name}`);
  console.log(`PASS ${name}`);
}

// 1 Upload
const file1 = Buffer.from("%PDF-1.4 smoke-hub-v1 " + "x".repeat(1000));
const { documentId, digest } = await insertBinary({
  kind: "other",
  filename: "smoke-hub.pdf",
  mime: "application/pdf",
  file: file1,
});
ok("upload");

// 2 Version
const file2 = Buffer.from("%PDF-1.4 smoke-hub-v2 " + "y".repeat(2000));
const versionId2 = randomUUID();
const now = new Date().toISOString();
const digest2 = sha256(file2);
await sql`
  INSERT INTO lean_event_document_versions (
    tenant_id, id, document_id, version, filename, mime, bytes, sha256,
    compression, chunk_count, chunk_size, created_at, created_by, source, note
  ) VALUES (
    ${tenantId}, ${versionId2}, ${documentId}, ${2}, ${"smoke-hub.pdf"}, ${"application/pdf"},
    ${file2.byteLength}, ${digest2}, ${"none"}, ${1}, ${CHUNK},
    ${now}::timestamptz, ${"smoke"}, ${"upload"}, ${"v2"}
  )
`;
await sql`
  INSERT INTO lean_event_document_chunks (
    tenant_id, version_id, chunk_index, bytes, sha256, payload
  ) VALUES (
    ${tenantId}, ${versionId2}, ${0}, ${file2.byteLength}, ${digest2}, ${file2}
  )
`;
await sql`
  UPDATE lean_event_documents
  SET current_version=2, bytes=${file2.byteLength}, sha256=${digest2},
      revision=revision+1, updated_at=${now}::timestamptz, updated_by=${"smoke"}
  WHERE tenant_id=${tenantId} AND id=${documentId}
`;
ok("version");

// 3 Download + SHA
const dl = await readBytes(documentId);
assert.equal(Number(dl.meta.version), 2);
assert.equal(sha256(dl.bytes), digest2);
ok("download+sha256");

// 4 Preview mime
assert.equal(dl.meta.mime, "application/pdf");
ok("preview-mime");

// 5 Soft delete
await sql`
  UPDATE lean_event_documents
  SET deleted_at=now(), deleted_by=${"smoke"}, purge_after=now() + interval '30 days'
  WHERE tenant_id=${tenantId} AND id=${documentId}
`;
const listed = await sql`
  SELECT id FROM lean_event_documents
  WHERE tenant_id=${tenantId} AND id=${documentId} AND deleted_at IS NULL
`;
assert.equal(listed.length, 0);
const chunksStill = await sql`
  SELECT COUNT(*)::int AS n FROM lean_event_document_chunks c
  JOIN lean_event_document_versions v ON v.id=c.version_id AND v.tenant_id=c.tenant_id
  WHERE v.document_id=${documentId} AND c.tenant_id=${tenantId}
`;
assert.ok(Number(chunksStill[0].n) >= 1);
ok("soft-delete");

// 6 Restore
await sql`
  UPDATE lean_event_documents
  SET deleted_at=NULL, deleted_by=NULL, purge_after=NULL, updated_at=now()
  WHERE tenant_id=${tenantId} AND id=${documentId}
`;
const restored = await sql`
  SELECT id FROM lean_event_documents
  WHERE tenant_id=${tenantId} AND id=${documentId} AND deleted_at IS NULL
`;
assert.equal(restored.length, 1);
ok("restore");

// 7 Audit table writable (sequence-safe)
await sql`
  SELECT setval(
    pg_get_serial_sequence('lean_event_audit_events', 'id'),
    GREATEST((SELECT COALESCE(MAX(id), 1) FROM lean_event_audit_events), 1)
  )
`;
await sql`
  INSERT INTO lean_event_audit_events (
    ts, tenant_id, action, user_id, user_email, resource_type, resource_id, detail, payload
  ) VALUES (
    now(), ${tenantId}, ${"document.download"}, ${"smoke"}, ${"smoke@test.local"},
    ${"document"}, ${documentId}, ${"smoke"}, ${JSON.stringify({ verify: true, sha256: digest2 })}::jsonb
  )
`;
const audits = await sql`
  SELECT id FROM lean_event_audit_events
  WHERE tenant_id=${tenantId} AND resource_id=${documentId} AND action=${"document.download"}
  ORDER BY id DESC
  LIMIT 1
`;
assert.ok(audits.length >= 1);
ok("audit");

// 8 Supplier / travel / chat / venue cover via legacy path helper tables
const supplierPath = `lean-event/supplier-documents/${tenantId}/rubrica/sup-smoke/doc1-file.pdf`;
const travelPath = `lean-event/travel-docs/${tenantId}/evt1/asg1/seg1-document.pdf`;
const chatPath = `lean-event/event-chat/${tenantId}/evt1/att1-note.txt`;
const coverPath = `lean-event/venue-covers/${tenantId}/venue1.jpg`;

for (const [label, legacyPath, kind, mime, body] of [
  ["supplier", supplierPath, "supplier_agreement", "application/pdf", Buffer.from("supplier-smoke")],
  ["travel", travelPath, "travel_id", "application/pdf", Buffer.from("travel-smoke")],
  ["chat", chatPath, "other", "text/plain", Buffer.from("chat-smoke")],
  ["venue-cover", coverPath, "other", "image/jpeg", Buffer.from("cover-smoke")],
]) {
  await insertBinary({
    kind,
    filename: `${label}.bin`,
    mime,
    file: body,
    legacyPath,
  });
  const row = await sql`
    SELECT d.id, v.id AS version_id, v.sha256
    FROM lean_event_documents d
    JOIN lean_event_document_versions v
      ON v.tenant_id=d.tenant_id AND v.document_id=d.id AND v.version=d.current_version
    WHERE d.tenant_id=${tenantId} AND d.blob_path=${legacyPath}
    LIMIT 1
  `;
  assert.equal(row.length, 1);
  const chunks = await sql`
    SELECT payload FROM lean_event_document_chunks
    WHERE tenant_id=${tenantId} AND version_id=${row[0].version_id}
    ORDER BY chunk_index
  `;
  const rebuilt = Buffer.concat(chunks.map((c) => decode(c.payload)));
  assert.equal(sha256(rebuilt), row[0].sha256);
  ok(`${label}-get`);
}

// Cleanup smoke docs
const smokeDocs = await sql`
  SELECT id FROM lean_event_documents
  WHERE tenant_id=${tenantId} AND created_by=${"smoke"}
`;
for (const row of smokeDocs) {
  await sql`
    UPDATE lean_event_documents
    SET legal_hold=FALSE, deleted_at=COALESCE(deleted_at, now()), purge_after=now() - interval '1 day'
    WHERE tenant_id=${tenantId} AND id=${row.id}
  `;
  await sql`SELECT lean_event_purge_document(${tenantId}, ${row.id})`;
}
ok("cleanup");

console.log(`SMOKE_OK steps=${steps.length}`);
console.log("BLOB_NOT_USED=yes");
console.log("BLOB_STORE_UNCHANGED=yes");
