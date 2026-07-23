/**
 * Bridge: legacy binary helpers (travel/chat/supplier/venue) → Postgres chunks.
 * Blob remains read-only fallback during cutover.
 */

import { createHash, randomUUID } from "node:crypto";

import {
  getLeanEventSql,
  isLeanEventDatabaseEnabled,
} from "@/lib/lean-event/db";
import { DOCUMENT_CHUNK_SIZE } from "@/lib/lean-event/document-postgres-store";
import type { LeanEventDocumentKind } from "@/lib/lean-event/document-kinds";

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

export function isPostgresBinaryStoreEnabled(): boolean {
  return isLeanEventDatabaseEnabled();
}

export async function storeLegacyBinaryInPostgres(input: {
  tenantId: string;
  kind: LeanEventDocumentKind;
  filename: string;
  mime: string;
  file: Buffer;
  legacyPath: string;
  eventId?: string | null;
  personId?: string | null;
  assignmentId?: string | null;
  supplierId?: string | null;
  workspaceId?: string | null;
  meta?: Record<string, unknown>;
}): Promise<{ documentId: string; sha256: string }> {
  const sql = getLeanEventSql();
  if (!sql) throw new Error("LEAN_EVENT_DATABASE_REQUIRED");
  if (input.file.byteLength === 0) throw new Error("EMPTY_FILE_NOT_ALLOWED");

  const documentId = randomUUID();
  const versionId = randomUUID();
  const now = new Date().toISOString();
  const digest = sha256(input.file);
  const chunks: Buffer[] = [];
  for (let i = 0; i < input.file.byteLength; i += DOCUMENT_CHUNK_SIZE) {
    chunks.push(input.file.subarray(i, i + DOCUMENT_CHUNK_SIZE));
  }

  // Idempotent: if same legacy path already stored, return existing
  const existing = await sql`
    SELECT id, sha256 FROM lean_event_documents
    WHERE tenant_id = ${input.tenantId}
      AND blob_path = ${input.legacyPath}
      AND deleted_at IS NULL
    LIMIT 1
  `;
  if (existing[0]) {
    return {
      documentId: String(existing[0].id),
      sha256: String(existing[0].sha256 || digest),
    };
  }

  await sql`
    INSERT INTO lean_event_documents (
      id, tenant_id, kind, status, title, filename, mime, bytes, sha256,
      blob_path, revision, current_version, legal_hold, retention_class,
      person_id, event_id, assignment_id, supplier_id, workspace_id,
      created_at, updated_at, created_by, updated_by, meta
    ) VALUES (
      ${documentId}, ${input.tenantId}, ${input.kind}, ${"ready"}, ${input.filename},
      ${input.filename}, ${input.mime}, ${input.file.byteLength}, ${digest},
      ${input.legacyPath}, ${1}, ${1}, ${false}, ${"standard"},
      ${input.personId ?? null}, ${input.eventId ?? null}, ${input.assignmentId ?? null},
      ${input.supplierId ?? null}, ${input.workspaceId ?? null},
      ${now}::timestamptz, ${now}::timestamptz, ${"runtime"}, ${"runtime"},
      ${JSON.stringify({
        ...(input.meta ?? {}),
        legacyBlobPath: input.legacyPath,
        runtimeStore: "postgres",
      })}::jsonb
    )
  `;

  await sql`
    INSERT INTO lean_event_document_versions (
      tenant_id, id, document_id, version, filename, mime, bytes, sha256,
      compression, chunk_count, chunk_size, created_at, created_by, source, note
    ) VALUES (
      ${input.tenantId}, ${versionId}, ${documentId}, ${1}, ${input.filename},
      ${input.mime}, ${input.file.byteLength}, ${digest}, ${"none"},
      ${chunks.length}, ${DOCUMENT_CHUNK_SIZE}, ${now}::timestamptz,
      ${"runtime"}, ${"upload"}, ${"legacy helper → postgres"}
    )
  `;

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    await sql`
      INSERT INTO lean_event_document_chunks (
        tenant_id, version_id, chunk_index, bytes, sha256, payload
      ) VALUES (
        ${input.tenantId}, ${versionId}, ${index}, ${chunk.byteLength},
        ${sha256(chunk)}, ${chunk}
      )
    `;
  }

  return { documentId, sha256: digest };
}

export async function readLegacyBinaryFromPostgres(input: {
  tenantId: string;
  legacyPath: string;
}): Promise<{ buffer: Buffer; contentType: string } | null> {
  const sql = getLeanEventSql();
  if (!sql) return null;

  const docs = await sql`
    SELECT d.id, d.mime, v.id AS version_id, v.chunk_count, v.sha256
    FROM lean_event_documents d
    JOIN lean_event_document_versions v
      ON v.tenant_id = d.tenant_id AND v.document_id = d.id AND v.version = d.current_version
    WHERE d.tenant_id = ${input.tenantId}
      AND d.blob_path = ${input.legacyPath}
      AND d.deleted_at IS NULL
    LIMIT 1
  `;
  const doc = docs[0] as
    | { mime: string; version_id: string; chunk_count: number; sha256: string }
    | undefined;
  if (!doc) return null;

  const chunkRows = await sql`
    SELECT payload FROM lean_event_document_chunks
    WHERE tenant_id = ${input.tenantId} AND version_id = ${doc.version_id}
    ORDER BY chunk_index ASC
  `;
  if (chunkRows.length !== Number(doc.chunk_count)) return null;

  const parts = chunkRows.map((r) => {
    const p = r.payload;
    if (Buffer.isBuffer(p)) return p;
    if (typeof p === "string" && p.startsWith("\\x")) {
      return Buffer.from(p.slice(2), "hex");
    }
    return Buffer.from(p as Uint8Array);
  });
  const buffer = Buffer.concat(parts);
  if (sha256(buffer) !== String(doc.sha256)) {
    throw new Error("DOCUMENT_SHA256_MISMATCH");
  }
  return { buffer, contentType: String(doc.mime || "application/octet-stream") };
}
