/**
 * Export settimanale tenant (Fase C) — metadati Neon + inventario documenti.
 * Scritto su Blob: lean-event/exports/{tenantId}/{stamp}/tenant-export.json
 */

import { put } from "@vercel/blob";

import { writeLeanEventAuditEvent } from "@/lib/lean-event/audit-log";
import {
  getLeanEventSql,
  isLeanEventDatabaseEnabled,
} from "@/lib/lean-event/db";
import { loadTenantsFile } from "@/lib/lean-event/storage";

const EXPORT_ROOT = "lean-event/exports";

function isBlobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function stampNow(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export interface TenantExportResult {
  tenantId: string;
  tenantSlug?: string;
  ok: boolean;
  exportPath?: string;
  entityCounts?: Record<string, number>;
  documentCount?: number;
  error?: string;
  skipped?: boolean;
}

async function exportOneTenant(input: {
  tenantId: string;
  tenantSlug?: string;
  tenantName?: string;
}): Promise<TenantExportResult> {
  if (!isLeanEventDatabaseEnabled()) {
    return {
      tenantId: input.tenantId,
      tenantSlug: input.tenantSlug,
      ok: true,
      skipped: true,
      error: "Neon non configurato",
    };
  }
  if (!isBlobEnabled()) {
    return {
      tenantId: input.tenantId,
      tenantSlug: input.tenantSlug,
      ok: true,
      skipped: true,
      error: "Blob non configurato",
    };
  }

  const sql = getLeanEventSql();
  if (!sql) {
    return {
      tenantId: input.tenantId,
      ok: false,
      error: "SQL client non disponibile",
    };
  }

  try {
    const entityRows = await sql`
      SELECT entity_type, COUNT(*)::int AS n
      FROM lean_event_entities
      WHERE tenant_id = ${input.tenantId}
      GROUP BY entity_type
      ORDER BY entity_type
    `;
    const entityCounts = Object.fromEntries(
      entityRows.map((row) => [String(row.entity_type), Number(row.n)])
    );

    const entities = await sql`
      SELECT id, entity_type, revision, payload, created_at, updated_at,
             deleted_at, purge_after
      FROM lean_event_entities
      WHERE tenant_id = ${input.tenantId}
      ORDER BY entity_type, updated_at DESC
    `;

    const documents = await sql`
      SELECT id, kind, status, title, filename, mime, bytes, sha256,
             blob_path, revision, person_id, event_id, assignment_id,
             supplier_id, workspace_id, created_at, updated_at, deleted_at
      FROM lean_event_documents
      WHERE tenant_id = ${input.tenantId}
      ORDER BY updated_at DESC
    `;

    const versionsMeta = await sql`
      SELECT entity_type, entity_id, COUNT(*)::int AS n,
             MAX(revision)::int AS max_revision
      FROM lean_event_entity_versions
      WHERE tenant_id = ${input.tenantId}
      GROUP BY entity_type, entity_id
    `;

    const createdAt = new Date().toISOString();
    const payload = {
      schemaVersion: 1,
      createdAt,
      tenant: {
        id: input.tenantId,
        slug: input.tenantSlug,
        name: input.tenantName,
      },
      summary: {
        entityCounts,
        documentCount: documents.length,
        versionedEntities: versionsMeta.length,
      },
      entities,
      documents,
      versionsIndex: versionsMeta,
    };

    const exportPath = `${EXPORT_ROOT}/${input.tenantId}/${stampNow()}/tenant-export.json`;
    await put(exportPath, JSON.stringify(payload), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    await writeLeanEventAuditEvent({
      action: "tenant_export",
      tenantId: input.tenantId,
      tenantSlug: input.tenantSlug,
      tenantName: input.tenantName,
      detail: exportPath,
      payload: payload.summary,
    });

    return {
      tenantId: input.tenantId,
      tenantSlug: input.tenantSlug,
      ok: true,
      exportPath,
      entityCounts,
      documentCount: documents.length,
    };
  } catch (error) {
    return {
      tenantId: input.tenantId,
      tenantSlug: input.tenantSlug,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function exportAllTenants(): Promise<TenantExportResult[]> {
  const file = await loadTenantsFile();
  const results: TenantExportResult[] = [];
  for (const tenant of file.tenants) {
    results.push(
      await exportOneTenant({
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
      })
    );
  }
  return results;
}
