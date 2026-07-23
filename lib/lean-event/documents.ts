/**
 * Registry documenti Lean Event (metadati Neon + binario in chunks Postgres).
 * Fonte: docs/design/lean-event-storage-architecture-correction-plan.md
 * Runtime documentale: PostgreSQL only (no Blob).
 */

import {
  getLeanEventSql,
  isLeanEventDatabaseEnabled,
} from "@/lib/lean-event/db";
import {
  appendDocumentVersion,
  createDocumentWithBytes,
  documentHasPostgresContent,
  purgeDocumentPg,
  readDocumentBytes,
  restoreDocumentPg,
  setDocumentLegalHold,
  softDeleteDocumentPg,
} from "@/lib/lean-event/document-postgres-store";
import type { LeanEventDocumentKind } from "@/lib/lean-event/document-kinds";
import type { LeanEventSession } from "@/types/lean-event";

export type { LeanEventDocumentKind } from "@/lib/lean-event/document-kinds";

export type LeanEventDocumentStatus =
  | "ready"
  | "generating"
  | "failed"
  | "archived";

export interface LeanEventDocument {
  id: string;
  tenantId: string;
  kind: LeanEventDocumentKind;
  status: LeanEventDocumentStatus;
  title?: string | null;
  filename: string;
  mime: string;
  bytes: number;
  sha256?: string | null;
  /** Legacy Blob path — nullable after 008; do not use for new writes. */
  blobPath?: string | null;
  currentVersion: number;
  legalHold: boolean;
  retentionClass: string;
  revision: number;
  personId?: string | null;
  eventId?: string | null;
  assignmentId?: string | null;
  supplierId?: string | null;
  workspaceId?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
  purgeAfter?: string | null;
  meta?: Record<string, unknown>;
}

function assertDb() {
  if (!isLeanEventDatabaseEnabled()) {
    throw new Error("LEAN_EVENT_DATABASE_REQUIRED");
  }
  const sql = getLeanEventSql();
  if (!sql) {
    throw new Error("LEAN_EVENT_DATABASE_REQUIRED");
  }
  return sql;
}

function rowToDocument(row: Record<string, unknown>): LeanEventDocument {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    kind: row.kind as LeanEventDocumentKind,
    status: (row.status as LeanEventDocumentStatus) ?? "ready",
    title: (row.title as string | null) ?? null,
    filename: String(row.filename),
    mime: String(row.mime),
    bytes: Number(row.bytes ?? 0),
    sha256: (row.sha256 as string | null) ?? null,
    blobPath: (row.blob_path as string | null) ?? null,
    currentVersion: Number(row.current_version ?? 1),
    legalHold: row.legal_hold === true,
    retentionClass: String(row.retention_class ?? "standard"),
    revision: Number(row.revision ?? 1),
    personId: (row.person_id as string | null) ?? null,
    eventId: (row.event_id as string | null) ?? null,
    assignmentId: (row.assignment_id as string | null) ?? null,
    supplierId: (row.supplier_id as string | null) ?? null,
    workspaceId: (row.workspace_id as string | null) ?? null,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at),
    createdBy: (row.created_by as string | null) ?? null,
    updatedBy: (row.updated_by as string | null) ?? null,
    deletedAt:
      row.deleted_at == null
        ? null
        : row.deleted_at instanceof Date
          ? row.deleted_at.toISOString()
          : String(row.deleted_at),
    deletedBy: (row.deleted_by as string | null) ?? null,
    purgeAfter:
      row.purge_after == null
        ? null
        : row.purge_after instanceof Date
          ? row.purge_after.toISOString()
          : String(row.purge_after),
    meta:
      row.meta && typeof row.meta === "object"
        ? (row.meta as Record<string, unknown>)
        : {},
  };
}

export async function listDocuments(
  tenantId: string,
  options?: {
    kind?: LeanEventDocumentKind;
    personId?: string;
    eventId?: string;
    includeDeleted?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<{ items: LeanEventDocument[]; total: number }> {
  const sql = assertDb();
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);
  const offset = Math.max(options?.offset ?? 0, 0);
  const includeDeleted = options?.includeDeleted === true;
  const kind = options?.kind ?? null;
  const personId = options?.personId ?? null;
  const eventId = options?.eventId ?? null;

  const countRows = includeDeleted
    ? await sql`
        SELECT COUNT(*)::int AS n
        FROM lean_event_documents
        WHERE tenant_id = ${tenantId}
          AND (${kind}::text IS NULL OR kind = ${kind})
          AND (${personId}::text IS NULL OR person_id = ${personId})
          AND (${eventId}::text IS NULL OR event_id = ${eventId})
      `
    : await sql`
        SELECT COUNT(*)::int AS n
        FROM lean_event_documents
        WHERE tenant_id = ${tenantId}
          AND deleted_at IS NULL
          AND (${kind}::text IS NULL OR kind = ${kind})
          AND (${personId}::text IS NULL OR person_id = ${personId})
          AND (${eventId}::text IS NULL OR event_id = ${eventId})
      `;
  const total = Number(countRows[0]?.n ?? 0);

  const rows = includeDeleted
    ? await sql`
        SELECT *
        FROM lean_event_documents
        WHERE tenant_id = ${tenantId}
          AND (${kind}::text IS NULL OR kind = ${kind})
          AND (${personId}::text IS NULL OR person_id = ${personId})
          AND (${eventId}::text IS NULL OR event_id = ${eventId})
        ORDER BY updated_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `
    : await sql`
        SELECT *
        FROM lean_event_documents
        WHERE tenant_id = ${tenantId}
          AND deleted_at IS NULL
          AND (${kind}::text IS NULL OR kind = ${kind})
          AND (${personId}::text IS NULL OR person_id = ${personId})
          AND (${eventId}::text IS NULL OR event_id = ${eventId})
        ORDER BY updated_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

  return {
    total,
    items: rows.map((row) => rowToDocument(row as Record<string, unknown>)),
  };
}

export async function getDocument(
  tenantId: string,
  documentId: string,
  options?: { includeDeleted?: boolean }
): Promise<LeanEventDocument | null> {
  const sql = assertDb();
  const rows = await sql`
    SELECT *
    FROM lean_event_documents
    WHERE tenant_id = ${tenantId}
      AND id = ${documentId}
    LIMIT 1
  `;
  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) {
    return null;
  }
  const doc = rowToDocument(row);
  if (!options?.includeDeleted && doc.deletedAt) {
    return null;
  }
  return doc;
}

export async function createDocumentFromUpload(
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
  }
): Promise<LeanEventDocument> {
  const { documentId } = await createDocumentWithBytes(session, {
    ...input,
    source: "upload",
  });
  const created = await getDocument(session.tenantId, documentId);
  if (!created) {
    throw new Error("DOCUMENT_CREATE_FAILED");
  }
  return created;
}

export async function uploadDocumentVersion(
  session: LeanEventSession,
  documentId: string,
  input: {
    file: Buffer;
    filename?: string;
    mime?: string;
    expectedRevision: number;
  }
): Promise<LeanEventDocument> {
  await appendDocumentVersion(session, documentId, {
    ...input,
    source: "upload",
  });
  const doc = await getDocument(session.tenantId, documentId);
  if (!doc) {
    throw new Error("DOCUMENT_VERSION_FAILED");
  }
  return doc;
}

export async function softDeleteDocument(
  session: LeanEventSession,
  documentId: string
): Promise<LeanEventDocument | null> {
  const ok = await softDeleteDocumentPg(session, documentId);
  if (!ok) return null;
  return getDocument(session.tenantId, documentId, { includeDeleted: true });
}

export async function restoreDocument(
  session: LeanEventSession,
  documentId: string
): Promise<LeanEventDocument | null> {
  const ok = await restoreDocumentPg(session, documentId);
  if (!ok) return null;
  return getDocument(session.tenantId, documentId);
}

export async function setLegalHold(
  session: LeanEventSession,
  documentId: string,
  legalHold: boolean
): Promise<LeanEventDocument | null> {
  const ok = await setDocumentLegalHold(session, documentId, legalHold);
  if (!ok) return null;
  return getDocument(session.tenantId, documentId, { includeDeleted: true });
}

/** Hard delete solo post soft-delete + retention + !legal_hold. Non tocca Blob legacy. */
export async function purgeDocument(
  tenantId: string,
  documentId: string
): Promise<boolean> {
  return purgeDocumentPg(tenantId, documentId);
}

export async function loadDocumentFileBytes(
  tenantId: string,
  documentId: string,
  options?: { version?: number; verify?: boolean; includeDeleted?: boolean }
): Promise<{
  bytes: Buffer;
  mime: string;
  filename: string;
  sha256: string;
  version: number;
}> {
  const doc = await getDocument(tenantId, documentId, {
    includeDeleted: options?.includeDeleted,
  });
  if (!doc) {
    throw new Error("DOCUMENT_NOT_FOUND");
  }

  if (!(await documentHasPostgresContent(tenantId, documentId))) {
    throw new Error("DOCUMENT_CONTENT_UNAVAILABLE");
  }

  const { bytes, version } = await readDocumentBytes(tenantId, documentId, {
    version: options?.version,
    verify: options?.verify !== false,
  });
  return {
    bytes,
    mime: version.mime,
    filename: version.filename,
    sha256: version.sha256,
    version: version.version,
  };
}

/** Documenti soft-deleted con purge_after scaduto e senza legal hold. */
export async function listDocumentsDueForPurge(
  tenantId: string
): Promise<LeanEventDocument[]> {
  if (!isLeanEventDatabaseEnabled()) {
    return [];
  }
  const sql = getLeanEventSql();
  if (!sql) {
    return [];
  }
  const rows = await sql`
    SELECT *
    FROM lean_event_documents
    WHERE tenant_id = ${tenantId}
      AND deleted_at IS NOT NULL
      AND legal_hold = FALSE
      AND purge_after IS NOT NULL
      AND purge_after <= now()
    ORDER BY purge_after ASC
    LIMIT 500
  `;
  return rows.map((row) => rowToDocument(row as Record<string, unknown>));
}
