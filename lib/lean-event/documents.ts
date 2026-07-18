/**
 * Registry documenti Lean Event (metadati Neon + binario Blob).
 * Fonte: docs/lean-event-document-architecture.md
 */

import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";

import { del, put } from "@vercel/blob";

import {
  auditContextFromSession,
  writeLeanEventAuditEvent,
} from "@/lib/lean-event/audit-log";
import {
  getLeanEventSql,
  isLeanEventDatabaseEnabled,
} from "@/lib/lean-event/db";
import {
  computePurgeAfter,
  LEONYOU_TRASH_RETENTION_DAYS,
  sessionUserId,
} from "@/lib/lean-event/entity-lifecycle";
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
  blobPath: string;
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

const BLOB_ROOT = "lean-event/documents";

function isBlobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
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
    blobPath: String(row.blob_path),
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

function safeFilename(name: string): string {
  return name.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 180) || "file.bin";
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
  if (!isBlobEnabled()) {
    throw new Error("BLOB_REQUIRED");
  }
  const sql = assertDb();
  const userId = sessionUserId(session);
  const id = randomUUID();
  const now = new Date().toISOString();
  const filename = safeFilename(input.filename);
  const sha256 = createHash("sha256").update(input.file).digest("hex");
  const blobPath = `${BLOB_ROOT}/${session.tenantId}/${input.kind}/${id}/v1/${filename}`;

  await put(blobPath, input.file, {
    access: "private",
    contentType: input.mime || "application/octet-stream",
    addRandomSuffix: false,
    allowOverwrite: false,
  });

  await sql`
    INSERT INTO lean_event_documents (
      id, tenant_id, kind, status, title, filename, mime, bytes, sha256,
      blob_path, revision, person_id, event_id, assignment_id, supplier_id,
      workspace_id, created_at, updated_at, created_by, updated_by, meta
    ) VALUES (
      ${id},
      ${session.tenantId},
      ${input.kind},
      ${"ready"},
      ${input.title?.trim() || filename},
      ${filename},
      ${input.mime || "application/octet-stream"},
      ${input.file.byteLength},
      ${sha256},
      ${blobPath},
      ${1},
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

  await writeLeanEventAuditEvent({
    ...auditContextFromSession(session),
    action: "document_create",
    resourceType: "document",
    resourceId: id,
    detail: input.kind,
  });

  const created = await getDocument(session.tenantId, id);
  if (!created) {
    throw new Error("DOCUMENT_CREATE_FAILED");
  }
  return created;
}

export async function softDeleteDocument(
  session: LeanEventSession,
  documentId: string
): Promise<LeanEventDocument | null> {
  const sql = assertDb();
  const current = await getDocument(session.tenantId, documentId, {
    includeDeleted: true,
  });
  if (!current || current.deletedAt) {
    return null;
  }

  const userId = sessionUserId(session);
  const deletedAt = new Date().toISOString();
  const purgeAfter = computePurgeAfter(deletedAt);
  const revision = current.revision + 1;

  await sql`
    UPDATE lean_event_documents
    SET
      deleted_at = ${deletedAt}::timestamptz,
      deleted_by = ${userId},
      purge_after = ${purgeAfter}::timestamptz,
      revision = ${revision},
      updated_at = ${deletedAt}::timestamptz,
      updated_by = ${userId}
    WHERE tenant_id = ${session.tenantId}
      AND id = ${documentId}
  `;

  await writeLeanEventAuditEvent({
    ...auditContextFromSession(session),
    action: "document_soft_delete",
    resourceType: "document",
    resourceId: documentId,
    detail: `retention ${LEONYOU_TRASH_RETENTION_DAYS}d`,
  });

  return getDocument(session.tenantId, documentId, { includeDeleted: true });
}

export async function restoreDocument(
  session: LeanEventSession,
  documentId: string
): Promise<LeanEventDocument | null> {
  const sql = assertDb();
  const current = await getDocument(session.tenantId, documentId, {
    includeDeleted: true,
  });
  if (!current?.deletedAt) {
    return null;
  }

  const userId = sessionUserId(session);
  const now = new Date().toISOString();
  const revision = current.revision + 1;

  await sql`
    UPDATE lean_event_documents
    SET
      deleted_at = NULL,
      deleted_by = NULL,
      purge_after = NULL,
      revision = ${revision},
      updated_at = ${now}::timestamptz,
      updated_by = ${userId}
    WHERE tenant_id = ${session.tenantId}
      AND id = ${documentId}
  `;

  await writeLeanEventAuditEvent({
    ...auditContextFromSession(session),
    action: "document_restore",
    resourceType: "document",
    resourceId: documentId,
  });

  return getDocument(session.tenantId, documentId);
}

/** Hard delete Blob + riga (solo dopo purge retention o admin esplicito). */
export async function purgeDocument(
  tenantId: string,
  documentId: string
): Promise<boolean> {
  const sql = assertDb();
  const doc = await getDocument(tenantId, documentId, { includeDeleted: true });
  if (!doc) {
    return false;
  }
  if (isBlobEnabled()) {
    try {
      await del(doc.blobPath);
    } catch {
      // continua: riga DB va comunque rimossa
    }
  }
  await sql`
    DELETE FROM lean_event_documents
    WHERE tenant_id = ${tenantId}
      AND id = ${documentId}
  `;
  await writeLeanEventAuditEvent({
    action: "entity_purge",
    tenantId,
    resourceType: "document",
    resourceId: documentId,
  });
  return true;
}

/** Documenti soft-deleted con purge_after scaduto. */
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
      AND purge_after IS NOT NULL
      AND purge_after <= now()
    ORDER BY purge_after ASC
    LIMIT 500
  `;
  return rows.map((row) => rowToDocument(row as Record<string, unknown>));
}
