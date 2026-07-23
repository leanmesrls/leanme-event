/**
 * Document binary store on tenant Postgres (chunks BYTEA).
 * Domain typed tables are untouched. Versions/chunks are append-only.
 */

import { createHash, randomUUID } from "node:crypto";

import type { NeonQueryFunction } from "@neondatabase/serverless";

import {
  auditContextFromSession,
  writeLeanEventAuditEvent,
} from "@/lib/lean-event/audit-log";
import {
  getLeanEventSql,
  isLeanEventDatabaseEnabled,
} from "@/lib/lean-event/db";
import type { LeanEventDocumentKind } from "@/lib/lean-event/document-kinds";
import {
  computePurgeAfter,
  LEONYOU_TRASH_RETENTION_DAYS,
  sessionUserId,
} from "@/lib/lean-event/entity-lifecycle";
import type { LeanEventSession } from "@/types/lean-event";

export const DOCUMENT_CHUNK_SIZE = 512 * 1024;

type Sql = NeonQueryFunction<false, false>;

export type DocumentContentSource =
  | "upload"
  | "generated"
  | "migration"
  | "restore";

export interface DocumentVersionMeta {
  id: string;
  documentId: string;
  version: number;
  filename: string;
  mime: string;
  bytes: number;
  sha256: string;
  compression: "none" | "gzip";
  chunkCount: number;
  chunkSize: number;
  createdAt: string;
  createdBy: string | null;
  source: DocumentContentSource;
  note: string | null;
}

function assertSql(): Sql {
  if (!isLeanEventDatabaseEnabled()) {
    throw new Error("LEAN_EVENT_DATABASE_REQUIRED");
  }
  const sql = getLeanEventSql();
  if (!sql) {
    throw new Error("LEAN_EVENT_DATABASE_REQUIRED");
  }
  return sql;
}

export function sha256Hex(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function splitIntoChunks(
  file: Buffer,
  chunkSize = DOCUMENT_CHUNK_SIZE
): Buffer[] {
  if (file.byteLength === 0) {
    return [Buffer.alloc(0)];
  }
  const chunks: Buffer[] = [];
  for (let offset = 0; offset < file.byteLength; offset += chunkSize) {
    chunks.push(file.subarray(offset, offset + chunkSize));
  }
  return chunks;
}

export function safeDocumentFilename(name: string): string {
  return name.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 180) || "file.bin";
}

function asIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function decodeBytea(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value === "string") {
    if (value.startsWith("\\x")) {
      return Buffer.from(value.slice(2), "hex");
    }
    return Buffer.from(value, "base64");
  }
  throw new Error("INVALID_BYTEA");
}

export async function getDocumentVersion(
  tenantId: string,
  documentId: string,
  version?: number
): Promise<DocumentVersionMeta | null> {
  const sql = assertSql();
  const rows =
    version == null
      ? await sql`
          SELECT v.*
          FROM lean_event_document_versions v
          JOIN lean_event_documents d
            ON d.tenant_id = v.tenant_id AND d.id = v.document_id
          WHERE v.tenant_id = ${tenantId}
            AND v.document_id = ${documentId}
            AND v.version = d.current_version
          LIMIT 1
        `
      : await sql`
          SELECT *
          FROM lean_event_document_versions
          WHERE tenant_id = ${tenantId}
            AND document_id = ${documentId}
            AND version = ${version}
          LIMIT 1
        `;
  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: String(row.id),
    documentId: String(row.document_id),
    version: Number(row.version),
    filename: String(row.filename),
    mime: String(row.mime),
    bytes: Number(row.bytes),
    sha256: String(row.sha256),
    compression: (row.compression as "none" | "gzip") ?? "none",
    chunkCount: Number(row.chunk_count),
    chunkSize: Number(row.chunk_size),
    createdAt: asIso(row.created_at),
    createdBy: (row.created_by as string | null) ?? null,
    source: (row.source as DocumentContentSource) ?? "upload",
    note: (row.note as string | null) ?? null,
  };
}

export async function readDocumentBytes(
  tenantId: string,
  documentId: string,
  options?: { version?: number; verify?: boolean }
): Promise<{ bytes: Buffer; version: DocumentVersionMeta }> {
  const sql = assertSql();
  const versionMeta = await getDocumentVersion(
    tenantId,
    documentId,
    options?.version
  );
  if (!versionMeta) {
    throw new Error("DOCUMENT_VERSION_NOT_FOUND");
  }

  const chunkRows = await sql`
    SELECT chunk_index, bytes, sha256, payload
    FROM lean_event_document_chunks
    WHERE tenant_id = ${tenantId}
      AND version_id = ${versionMeta.id}
    ORDER BY chunk_index ASC
  `;

  if (chunkRows.length !== versionMeta.chunkCount) {
    throw new Error("DOCUMENT_CHUNK_COUNT_MISMATCH");
  }

  const parts: Buffer[] = [];
  let total = 0;
  for (const row of chunkRows) {
    const payload = decodeBytea((row as Record<string, unknown>).payload);
    const expectedChunkSha = String((row as Record<string, unknown>).sha256);
    if (sha256Hex(payload) !== expectedChunkSha) {
      throw new Error("DOCUMENT_CHUNK_HASH_MISMATCH");
    }
    parts.push(payload);
    total += payload.byteLength;
  }

  const bytes = Buffer.concat(parts, total);
  if (bytes.byteLength !== versionMeta.bytes) {
    throw new Error("DOCUMENT_BYTE_LENGTH_MISMATCH");
  }
  if (options?.verify !== false) {
    const digest = sha256Hex(bytes);
    if (digest !== versionMeta.sha256) {
      throw new Error("DOCUMENT_SHA256_MISMATCH");
    }
  }
  return { bytes, version: versionMeta };
}

async function insertVersionWithChunks(
  sql: Sql,
  input: {
    tenantId: string;
    documentId: string;
    version: number;
    filename: string;
    mime: string;
    file: Buffer;
    createdBy: string | null;
    source: DocumentContentSource;
    note?: string | null;
    auditEventId?: number | null;
  }
): Promise<DocumentVersionMeta> {
  const versionId = randomUUID();
  const now = new Date().toISOString();
  if (input.file.byteLength === 0) {
    throw new Error("EMPTY_FILE_NOT_ALLOWED");
  }

  const fileSha = sha256Hex(input.file);
  const chunks = splitIntoChunks(input.file);

  const statements = [
    sql`
      INSERT INTO lean_event_document_versions (
        tenant_id, id, document_id, version, filename, mime, bytes, sha256,
        compression, chunk_count, chunk_size, created_at, created_by, source, note, audit_event_id
      ) VALUES (
        ${input.tenantId},
        ${versionId},
        ${input.documentId},
        ${input.version},
        ${input.filename},
        ${input.mime},
        ${input.file.byteLength},
        ${fileSha},
        ${"none"},
        ${chunks.length},
        ${DOCUMENT_CHUNK_SIZE},
        ${now}::timestamptz,
        ${input.createdBy},
        ${input.source},
        ${input.note ?? null},
        ${input.auditEventId ?? null}
      )
    `,
    ...chunks.map(
      (chunk, index) => sql`
        INSERT INTO lean_event_document_chunks (
          tenant_id, version_id, chunk_index, bytes, sha256, payload
        ) VALUES (
          ${input.tenantId},
          ${versionId},
          ${index},
          ${chunk.byteLength},
          ${sha256Hex(chunk)},
          ${chunk}
        )
      `
    ),
  ];

  if (typeof sql.transaction === "function") {
    await sql.transaction(statements);
  } else {
    for (const statement of statements) {
      await statement;
    }
  }

  return {
    id: versionId,
    documentId: input.documentId,
    version: input.version,
    filename: input.filename,
    mime: input.mime,
    bytes: input.file.byteLength,
    sha256: fileSha,
    compression: "none",
      chunkCount: chunks.length,
    chunkSize: DOCUMENT_CHUNK_SIZE,
    createdAt: now,
    createdBy: input.createdBy,
    source: input.source,
    note: input.note ?? null,
  };
}

export async function createDocumentWithBytes(
  session: LeanEventSession,
  input: {
    file: Buffer;
    filename: string;
    mime: string;
    kind: LeanEventDocumentKind;
    title?: string;
    personId?: string;
    eventId?: string;
    assignmentId?: string;
    supplierId?: string;
    workspaceId?: string;
    meta?: Record<string, unknown>;
    source?: DocumentContentSource;
    note?: string;
    retentionClass?: string;
  }
): Promise<{
  documentId: string;
  version: DocumentVersionMeta;
}> {
  const sql = assertSql();
  const userId = sessionUserId(session);
  const documentId = randomUUID();
  const now = new Date().toISOString();
  const filename = safeDocumentFilename(input.filename);
  const mime = input.mime || "application/octet-stream";
  const fileSha = sha256Hex(input.file);

  await sql`
    INSERT INTO lean_event_documents (
      id, tenant_id, kind, status, title, filename, mime, bytes, sha256,
      blob_path, revision, current_version, legal_hold, retention_class,
      person_id, event_id, assignment_id, supplier_id, workspace_id,
      created_at, updated_at, created_by, updated_by, meta
    ) VALUES (
      ${documentId},
      ${session.tenantId},
      ${input.kind},
      ${"ready"},
      ${input.title?.trim() || filename},
      ${filename},
      ${mime},
      ${input.file.byteLength},
      ${fileSha},
      ${null},
      ${1},
      ${1},
      ${false},
      ${input.retentionClass ?? "standard"},
      ${input.personId ?? null},
      ${input.eventId ?? null},
      ${input.assignmentId ?? null},
      ${input.supplierId ?? null},
      ${input.workspaceId ?? null},
      ${now}::timestamptz,
      ${now}::timestamptz,
      ${userId},
      ${userId},
      ${JSON.stringify(input.meta ?? {})}::jsonb
    )
  `;

  const version = await insertVersionWithChunks(sql, {
    tenantId: session.tenantId,
    documentId,
    version: 1,
    filename,
    mime,
    file: input.file,
    createdBy: userId,
    source: input.source ?? "upload",
    note: input.note ?? null,
  });

  await writeLeanEventAuditEvent({
    ...auditContextFromSession(session),
    action: "document.create",
    resourceType: "document",
    resourceId: documentId,
    detail: input.kind,
    payload: {
      version: 1,
      sha256: version.sha256,
      bytes: version.bytes,
      filename,
    },
  });

  return { documentId, version };
}

export async function appendDocumentVersion(
  session: LeanEventSession,
  documentId: string,
  input: {
    file: Buffer;
    filename?: string;
    mime?: string;
    expectedRevision: number;
    source?: DocumentContentSource;
    note?: string;
  }
): Promise<DocumentVersionMeta> {
  const sql = assertSql();
  const userId = sessionUserId(session);
  const rows = await sql`
    SELECT *
    FROM lean_event_documents
    WHERE tenant_id = ${session.tenantId}
      AND id = ${documentId}
    LIMIT 1
  `;
  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) {
    throw new Error("DOCUMENT_NOT_FOUND");
  }
  if (row.deleted_at) {
    throw new Error("DOCUMENT_DELETED");
  }
  const revision = Number(row.revision ?? 1);
  if (revision !== input.expectedRevision) {
    throw new Error("DOCUMENT_REVISION_CONFLICT");
  }

  const nextVersion = Number(row.current_version ?? 1) + 1;
  const filename = safeDocumentFilename(
    input.filename || String(row.filename)
  );
  const mime = input.mime || String(row.mime) || "application/octet-stream";
  const now = new Date().toISOString();

  const version = await insertVersionWithChunks(sql, {
    tenantId: session.tenantId,
    documentId,
    version: nextVersion,
    filename,
    mime,
    file: input.file,
    createdBy: userId,
    source: input.source ?? "upload",
    note: input.note ?? null,
  });

  const updated = await sql`
    UPDATE lean_event_documents
    SET
      current_version = ${nextVersion},
      filename = ${filename},
      mime = ${mime},
      bytes = ${version.bytes},
      sha256 = ${version.sha256},
      revision = ${revision + 1},
      updated_at = ${now}::timestamptz,
      updated_by = ${userId}
    WHERE tenant_id = ${session.tenantId}
      AND id = ${documentId}
      AND revision = ${revision}
    RETURNING id
  `;
  if (!updated.length) {
    throw new Error("DOCUMENT_REVISION_CONFLICT");
  }

  await writeLeanEventAuditEvent({
    ...auditContextFromSession(session),
    action: "document.upload_version",
    resourceType: "document",
    resourceId: documentId,
    payload: {
      version: nextVersion,
      sha256: version.sha256,
      bytes: version.bytes,
      filename,
    },
  });

  return version;
}

export async function softDeleteDocumentPg(
  session: LeanEventSession,
  documentId: string
): Promise<boolean> {
  const sql = assertSql();
  const userId = sessionUserId(session);
  const deletedAt = new Date().toISOString();
  const purgeAfter = computePurgeAfter(deletedAt);
  const result = await sql`
    UPDATE lean_event_documents
    SET
      deleted_at = ${deletedAt}::timestamptz,
      deleted_by = ${userId},
      purge_after = ${purgeAfter}::timestamptz,
      revision = revision + 1,
      updated_at = ${deletedAt}::timestamptz,
      updated_by = ${userId}
    WHERE tenant_id = ${session.tenantId}
      AND id = ${documentId}
      AND deleted_at IS NULL
    RETURNING id
  `;
  if (!result.length) return false;
  await writeLeanEventAuditEvent({
    ...auditContextFromSession(session),
    action: "document.soft_delete",
    resourceType: "document",
    resourceId: documentId,
    detail: `retention ${LEONYOU_TRASH_RETENTION_DAYS}d`,
  });
  return true;
}

export async function restoreDocumentPg(
  session: LeanEventSession,
  documentId: string
): Promise<boolean> {
  const sql = assertSql();
  const userId = sessionUserId(session);
  const now = new Date().toISOString();
  const result = await sql`
    UPDATE lean_event_documents
    SET
      deleted_at = NULL,
      deleted_by = NULL,
      purge_after = NULL,
      revision = revision + 1,
      updated_at = ${now}::timestamptz,
      updated_by = ${userId}
    WHERE tenant_id = ${session.tenantId}
      AND id = ${documentId}
      AND deleted_at IS NOT NULL
    RETURNING id
  `;
  if (!result.length) return false;
  await writeLeanEventAuditEvent({
    ...auditContextFromSession(session),
    action: "document.restore",
    resourceType: "document",
    resourceId: documentId,
  });
  return true;
}

export async function setDocumentLegalHold(
  session: LeanEventSession,
  documentId: string,
  legalHold: boolean
): Promise<boolean> {
  const sql = assertSql();
  const userId = sessionUserId(session);
  const now = new Date().toISOString();
  const result = await sql`
    UPDATE lean_event_documents
    SET
      legal_hold = ${legalHold},
      revision = revision + 1,
      updated_at = ${now}::timestamptz,
      updated_by = ${userId}
    WHERE tenant_id = ${session.tenantId}
      AND id = ${documentId}
    RETURNING id
  `;
  if (!result.length) return false;
  await writeLeanEventAuditEvent({
    ...auditContextFromSession(session),
    action: legalHold ? "document.legal_hold_on" : "document.legal_hold_off",
    resourceType: "document",
    resourceId: documentId,
  });
  return true;
}

/**
 * Hard delete only when soft-deleted, purge_after elapsed, and not on legal hold.
 * Disables immutability triggers temporarily inside a controlled procedure via
 * DELETE ... — triggers block DELETE; use session_replication_role or dedicated
 * purge functions. Here we use SQL functions created in apply script style:
 * delete chunks/versions/document with trigger bypass via SECURITY DEFINER fn.
 */
export async function purgeDocumentPg(
  tenantId: string,
  documentId: string
): Promise<boolean> {
  const sql = assertSql();
  const rows = await sql`
    SELECT id, legal_hold, deleted_at, purge_after
    FROM lean_event_documents
    WHERE tenant_id = ${tenantId}
      AND id = ${documentId}
    LIMIT 1
  `;
  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row || !row.deleted_at) return false;
  if (row.legal_hold === true) {
    throw new Error("DOCUMENT_LEGAL_HOLD");
  }
  if (row.purge_after && new Date(String(row.purge_after)).getTime() > Date.now()) {
    throw new Error("DOCUMENT_PURGE_NOT_DUE");
  }

  const purged = await sql`
    SELECT lean_event_purge_document(${tenantId}, ${documentId}) AS ok
  `;
  const ok = Boolean((purged[0] as { ok?: boolean } | undefined)?.ok);
  if (!ok) return false;

  await writeLeanEventAuditEvent({
    action: "document.purge",
    tenantId,
    resourceType: "document",
    resourceId: documentId,
  });
  return true;
}

export async function documentHasPostgresContent(
  tenantId: string,
  documentId: string
): Promise<boolean> {
  const sql = assertSql();
  const rows = await sql`
    SELECT 1 AS ok
    FROM lean_event_document_versions
    WHERE tenant_id = ${tenantId}
      AND document_id = ${documentId}
    LIMIT 1
  `;
  return rows.length > 0;
}
