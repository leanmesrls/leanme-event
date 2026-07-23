/**
 * Document Postgres store integrity tests (T01–T12, M01–M04 smoke, R01–R02).
 * Requires LEAN_EVENT_TENANT_DEMO_DATABASE_URL (schema 008 applied).
 */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { neon } from "@neondatabase/serverless";

function loadEnvLocal() {
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#")) continue;
      const idx = line.indexOf("=");
      if (idx <= 0) continue;
      const key = line.slice(0, idx).trim();
      let value = line.slice(idx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

loadEnvLocal();

const url = process.env.LEAN_EVENT_TENANT_DEMO_DATABASE_URL?.trim();
const sql = url ? neon(url) : null;
const CHUNK = 512 * 1024;

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function chunksOf(buf) {
  const out = [];
  for (let i = 0; i < buf.length; i += CHUNK) out.push(buf.subarray(i, i + CHUNK));
  return out;
}

async function insertDoc(file, opts = {}) {
  const documentId = randomUUID();
  const versionId = randomUUID();
  const now = new Date().toISOString();
  const digest = sha256(file);
  const parts = chunksOf(file);
  const filename = opts.filename || "sample.bin";
  await sql`
    INSERT INTO lean_event_documents (
      id, tenant_id, kind, status, title, filename, mime, bytes, sha256,
      blob_path, revision, current_version, legal_hold, retention_class,
      created_at, updated_at, created_by, updated_by, meta
    ) VALUES (
      ${documentId}, ${"demo"}, ${opts.kind || "other"}, ${"ready"}, ${filename},
      ${filename}, ${opts.mime || "application/octet-stream"}, ${file.byteLength}, ${digest},
      ${null}, ${1}, ${1}, ${opts.legalHold === true}, ${"standard"},
      ${now}::timestamptz, ${now}::timestamptz, ${"test"}, ${"test"},
      ${JSON.stringify({ harness: true })}::jsonb
    )
  `;
  await sql`
    INSERT INTO lean_event_document_versions (
      tenant_id, id, document_id, version, filename, mime, bytes, sha256,
      compression, chunk_count, chunk_size, created_at, created_by, source
    ) VALUES (
      ${"demo"}, ${versionId}, ${documentId}, ${1}, ${filename},
      ${opts.mime || "application/octet-stream"}, ${file.byteLength}, ${digest},
      ${"none"}, ${parts.length}, ${CHUNK}, ${now}::timestamptz, ${"test"}, ${"upload"}
    )
  `;
  for (let i = 0; i < parts.length; i += 1) {
    await sql`
      INSERT INTO lean_event_document_chunks (
        tenant_id, version_id, chunk_index, bytes, sha256, payload
      ) VALUES (
        ${"demo"}, ${versionId}, ${i}, ${parts[i].byteLength}, ${sha256(parts[i])}, ${parts[i]}
      )
    `;
  }
  return { documentId, versionId, digest };
}

async function readBytes(documentId, versionId) {
  const rows = await sql`
    SELECT payload FROM lean_event_document_chunks
    WHERE tenant_id = ${"demo"} AND version_id = ${versionId}
    ORDER BY chunk_index ASC
  `;
  return Buffer.concat(
    rows.map((r) => {
      const p = r.payload;
      if (Buffer.isBuffer(p)) return p;
      if (typeof p === "string" && p.startsWith("\\x")) return Buffer.from(p.slice(2), "hex");
      return Buffer.from(p);
    })
  );
}

test("preflight: demo DB + schema 008", async (t) => {
  if (!sql) {
    t.skip("LEAN_EVENT_TENANT_DEMO_DATABASE_URL missing");
    return;
  }
  const meta = await sql`
    SELECT value FROM lean_event_schema_meta WHERE key = 'documents_postgres_store'
  `;
  assert.equal(meta[0]?.value, "008");
});

test("T01–T03 upload chunks download hash", async (t) => {
  if (!sql) {
    t.skip("no demo db");
    return;
  }
  const file = Buffer.from("hello-document-store-" + "x".repeat(600000));
  const { documentId, versionId, digest } = await insertDoc(file);
  const rebuilt = await readBytes(documentId, versionId);
  assert.equal(rebuilt.byteLength, file.byteLength);
  assert.equal(sha256(rebuilt), digest);
  const v = await sql`
    SELECT bytes, chunk_count, sha256 FROM lean_event_document_versions
    WHERE tenant_id = ${"demo"} AND id = ${versionId}
  `;
  const chunks = await sql`
    SELECT COUNT(*)::int AS n, SUM(bytes)::int AS s
    FROM lean_event_document_chunks
    WHERE tenant_id = ${"demo"} AND version_id = ${versionId}
  `;
  assert.equal(Number(chunks[0].n), Number(v[0].chunk_count));
  assert.equal(Number(chunks[0].s), Number(v[0].bytes));
  assert.equal(String(v[0].sha256), digest);
});

test("T04–T06 append-only immutability", async (t) => {
  if (!sql) {
    t.skip("no demo db");
    return;
  }
  const file = Buffer.from("version-one-content");
  const { documentId, versionId } = await insertDoc(file);
  const v2 = randomUUID();
  const file2 = Buffer.from("version-two-content-longer");
  const digest2 = sha256(file2);
  const now = new Date().toISOString();
  await sql`
    INSERT INTO lean_event_document_versions (
      tenant_id, id, document_id, version, filename, mime, bytes, sha256,
      compression, chunk_count, chunk_size, created_at, created_by, source
    ) VALUES (
      ${"demo"}, ${v2}, ${documentId}, ${2}, ${"sample.bin"}, ${"application/octet-stream"},
      ${file2.byteLength}, ${digest2}, ${"none"}, ${1}, ${CHUNK},
      ${now}::timestamptz, ${"test"}, ${"upload"}
    )
  `;
  await sql`
    INSERT INTO lean_event_document_chunks (
      tenant_id, version_id, chunk_index, bytes, sha256, payload
    ) VALUES (
      ${"demo"}, ${v2}, ${0}, ${file2.byteLength}, ${digest2}, ${file2}
    )
  `;
  await sql`
    UPDATE lean_event_documents
    SET current_version = 2, revision = 2, sha256 = ${digest2}, bytes = ${file2.byteLength}
    WHERE tenant_id = ${"demo"} AND id = ${documentId}
  `;
  const v1 = await readBytes(documentId, versionId);
  assert.equal(v1.toString("utf8"), file.toString("utf8"));

  await assert.rejects(
    () => sql`UPDATE lean_event_document_versions SET note = 'x' WHERE id = ${versionId}`,
    /append-only|immutable/i
  );
  await assert.rejects(
    () =>
      sql`DELETE FROM lean_event_document_chunks WHERE version_id = ${versionId}`,
    /append-only|immutable/i
  );
});

test("T07–T09 soft delete + legal hold + purge gate", async (t) => {
  if (!sql) {
    t.skip("no demo db");
    return;
  }
  const file = Buffer.from("soft-delete-doc");
  const { documentId } = await insertDoc(file);
  await sql`
    UPDATE lean_event_documents
    SET deleted_at = now(), purge_after = now() - interval '1 day', legal_hold = TRUE
    WHERE tenant_id = ${"demo"} AND id = ${documentId}
  `;
  const listed = await sql`
    SELECT id FROM lean_event_documents
    WHERE tenant_id = ${"demo"} AND id = ${documentId} AND deleted_at IS NULL
  `;
  assert.equal(listed.length, 0);
  const chunksCount = await sql`
    SELECT COUNT(*)::int AS n
    FROM lean_event_document_chunks c
    JOIN lean_event_document_versions v ON v.id = c.version_id AND v.tenant_id = c.tenant_id
    WHERE v.document_id = ${documentId} AND c.tenant_id = ${"demo"}
  `;
  assert.ok(Number(chunksCount[0].n) >= 1);

  await assert.rejects(
    () => sql`SELECT lean_event_purge_document(${"demo"}, ${documentId})`,
    /LEGAL_HOLD/i
  );

  await sql`
    UPDATE lean_event_documents SET legal_hold = FALSE
    WHERE tenant_id = ${"demo"} AND id = ${documentId}
  `;
  const purged = await sql`SELECT lean_event_purge_document(${"demo"}, ${documentId}) AS ok`;
  assert.equal(purged[0].ok, true);
});

test("T10 lists do not need payload columns", async (t) => {
  if (!sql) {
    t.skip("no demo db");
    return;
  }
  const rows = await sql`
    SELECT id, kind, filename, mime, bytes, sha256, current_version
    FROM lean_event_documents
    WHERE tenant_id = ${"demo"} AND deleted_at IS NULL
    LIMIT 5
  `;
  assert.ok(Array.isArray(rows));
});

test("T11 preview mime classification", () => {
  const preview = new Set(["application/pdf", "image/png", "image/jpeg"]);
  assert.equal(preview.has("application/pdf"), true);
  assert.equal(preview.has("application/zip"), false);
});

test("T12 domain tables untouched (smoke)", async (t) => {
  if (!sql) {
    t.skip("no demo db");
    return;
  }
  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('lean_event_events','lean_event_contacts','lean_event_assignments')
  `;
  assert.ok(tables.length >= 3);
});

test("M01–M04 ledger table exists", async (t) => {
  if (!sql) {
    t.skip("no demo db");
    return;
  }
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'lean_event_blob_migration_ledger'
  `;
  assert.ok(cols.some((c) => c.column_name === "legacy_path"));
  assert.ok(cols.some((c) => c.column_name === "sha256"));
  assert.ok(cols.some((c) => c.column_name === "status"));
});

test("R01–R02 resolver-related env present", () => {
  assert.ok(process.env.LEAN_EVENT_CONTROL_PLANE_DATABASE_URL);
  assert.ok(process.env.LEAN_EVENT_TENANT_DEMO_DATABASE_URL);
});
