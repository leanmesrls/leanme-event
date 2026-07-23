/**
 * Storage Resolver — Postgres document store only (no Object Storage).
 */

import type { LeanEventTenantRecord } from "@/contracts/tenant-context";
import type {
  LeanEventDocumentStore,
  LeanEventStoredObject,
} from "@/contracts/document-store";
import { getTenantSql } from "@/core/infrastructure/database/connection-resolver";

export class LeanEventStorageResolverError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeanEventStorageResolverError";
  }
}

function decodeBytea(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value === "string") {
    if (value.startsWith("\\x")) return Buffer.from(value.slice(2), "hex");
    return Buffer.from(value, "base64");
  }
  throw new LeanEventStorageResolverError("INVALID_BYTEA");
}

/**
 * Tenant document store backed by Postgres chunks.
 * `path` may be a document id or a legacy pathname stored in blob_path metadata.
 */
export function getTenantDocumentStore(
  tenant: LeanEventTenantRecord
): LeanEventDocumentStore {
  if (tenant.status !== "active") {
    throw new LeanEventStorageResolverError(
      `Refuse storage for non-active tenant ${tenant.slug}`
    );
  }

  const sql = getTenantSql(tenant);

  return {
    async upload() {
      throw new LeanEventStorageResolverError(
        "UPLOAD_VIA_DOCUMENT_API_ONLY: use lib/lean-event/document-postgres-store"
      );
    },

    async download(pathOrDocumentId) {
      const versionRows = await sql`
        SELECT v.id AS version_id, v.chunk_count
        FROM lean_event_documents d
        JOIN lean_event_document_versions v
          ON v.tenant_id = d.tenant_id
         AND v.document_id = d.id
         AND v.version = d.current_version
        WHERE d.tenant_id = ${tenant.id}
          AND d.deleted_at IS NULL
          AND (d.id = ${pathOrDocumentId} OR d.blob_path = ${pathOrDocumentId})
        LIMIT 1
      `;
      const version = versionRows[0] as
        | { version_id: string; chunk_count: number }
        | undefined;
      if (!version) {
        throw new LeanEventStorageResolverError("DOCUMENT_NOT_FOUND");
      }
      const chunks = await sql`
        SELECT payload FROM lean_event_document_chunks
        WHERE tenant_id = ${tenant.id} AND version_id = ${version.version_id}
        ORDER BY chunk_index ASC
      `;
      if (chunks.length !== Number(version.chunk_count)) {
        throw new LeanEventStorageResolverError("DOCUMENT_CHUNK_COUNT_MISMATCH");
      }
      return Buffer.concat(chunks.map((c) => decodeBytea(c.payload)));
    },

    async list(prefix) {
      const rows = await sql`
        SELECT id, bytes, mime, blob_path, sha256
        FROM lean_event_documents
        WHERE tenant_id = ${tenant.id}
          AND deleted_at IS NULL
          AND (
            id LIKE ${prefix + "%"}
            OR COALESCE(blob_path, '') LIKE ${prefix + "%"}
            OR filename LIKE ${prefix + "%"}
          )
        ORDER BY updated_at DESC
        LIMIT 500
      `;
      return rows.map(
        (row) =>
          ({
            path: String(row.blob_path || row.id),
            bytes: Number(row.bytes || 0),
            contentType: String(row.mime || "application/octet-stream"),
            checksumSha256: (row.sha256 as string | null) ?? undefined,
          }) satisfies LeanEventStoredObject
      );
    },

    async delete() {
      throw new LeanEventStorageResolverError(
        "DELETE_VIA_DOCUMENT_LIFECYCLE_ONLY: soft-delete/purge on Postgres"
      );
    },

    async metadata(pathOrDocumentId) {
      const rows = await sql`
        SELECT id, bytes, mime, blob_path, sha256
        FROM lean_event_documents
        WHERE tenant_id = ${tenant.id}
          AND deleted_at IS NULL
          AND (id = ${pathOrDocumentId} OR blob_path = ${pathOrDocumentId})
        LIMIT 1
      `;
      const row = rows[0];
      if (!row) return null;
      return {
        path: String(row.blob_path || row.id),
        bytes: Number(row.bytes || 0),
        contentType: String(row.mime || "application/octet-stream"),
        checksumSha256: (row.sha256 as string | null) ?? undefined,
      } satisfies LeanEventStoredObject;
    },
  };
}
