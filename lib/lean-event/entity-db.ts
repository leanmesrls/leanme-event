/**
 * Dual-write Neon per entità gestite (Fase B).
 * Blob/FS resta source of truth per le letture finché non c’è cutover;
 * ogni mutazione upserta anche su Postgres.
 */

import type { LeanEventManagedEntityType } from "@/lib/lean-event/entity-lifecycle";
import {
  getLeanEventSql,
  isLeanEventDatabaseEnabled,
  isLeanEventDatabaseStrict,
} from "@/lib/lean-event/db";

export interface LeanEventDbEntityRow {
  id: string;
  tenantId: string;
  revision?: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  purgeAfter?: string | null;
}

function toTimestamptz(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) {
    return null;
  }
  return new Date(ms).toISOString();
}

async function reportDbError(context: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    JSON.stringify({
      lean_event_neon_error: { context, message },
    })
  );
  if (isLeanEventDatabaseStrict()) {
    throw error instanceof Error
      ? error
      : new Error(`LEAN_EVENT_NEON:${context}:${message}`);
  }
}

/** Upsert entità completa (payload JSONB = snapshot corrente). */
export async function upsertManagedEntityToNeon(
  entityType: LeanEventManagedEntityType,
  entity: LeanEventDbEntityRow
): Promise<void> {
  if (!isLeanEventDatabaseEnabled()) {
    return;
  }
  const sql = getLeanEventSql();
  if (!sql) {
    return;
  }

  try {
    const createdAt = toTimestamptz(entity.createdAt) ?? new Date().toISOString();
    const updatedAt = toTimestamptz(entity.updatedAt) ?? createdAt;
    const deletedAt = toTimestamptz(entity.deletedAt ?? null);
    const purgeAfter = toTimestamptz(entity.purgeAfter ?? null);
    const revision = entity.revision ?? 1;

    await sql`
      INSERT INTO lean_event_entities (
        id, tenant_id, entity_type, revision, payload,
        created_at, updated_at, created_by, updated_by,
        deleted_at, deleted_by, purge_after
      ) VALUES (
        ${entity.id},
        ${entity.tenantId},
        ${entityType},
        ${revision},
        ${entity as unknown as Record<string, unknown>},
        ${createdAt},
        ${updatedAt},
        ${entity.createdBy ?? null},
        ${entity.updatedBy ?? null},
        ${deletedAt},
        ${entity.deletedBy ?? null},
        ${purgeAfter}
      )
      ON CONFLICT (tenant_id, entity_type, id) DO UPDATE SET
        revision = EXCLUDED.revision,
        payload = EXCLUDED.payload,
        updated_at = EXCLUDED.updated_at,
        updated_by = EXCLUDED.updated_by,
        deleted_at = EXCLUDED.deleted_at,
        deleted_by = EXCLUDED.deleted_by,
        purge_after = EXCLUDED.purge_after
    `;
  } catch (error) {
    await reportDbError(`upsert:${entityType}:${entity.id}`, error);
  }
}

/** Snapshot revisione (append-only). Ignora conflitti unique già presenti. */
export async function insertManagedEntityVersionToNeon(
  tenantId: string,
  entityType: LeanEventManagedEntityType,
  entityId: string,
  revision: number,
  snapshot: unknown,
  changedBy?: string
): Promise<void> {
  if (!isLeanEventDatabaseEnabled()) {
    return;
  }
  const sql = getLeanEventSql();
  if (!sql) {
    return;
  }

  try {
    const by =
      changedBy ||
      (typeof snapshot === "object" &&
      snapshot &&
      "updatedBy" in snapshot &&
      typeof (snapshot as { updatedBy?: string }).updatedBy === "string"
        ? (snapshot as { updatedBy: string }).updatedBy
        : "system");

    await sql`
      INSERT INTO lean_event_entity_versions (
        tenant_id, entity_type, entity_id, revision, snapshot, changed_by
      ) VALUES (
        ${tenantId},
        ${entityType},
        ${entityId},
        ${revision},
        ${snapshot as unknown as Record<string, unknown>},
        ${by}
      )
      ON CONFLICT (tenant_id, entity_type, entity_id, revision) DO NOTHING
    `;
  } catch (error) {
    await reportDbError(
      `version:${entityType}:${entityId}:r${revision}`,
      error
    );
  }
}

/** Hard delete (purge cestino). */
export async function deleteManagedEntityFromNeon(
  tenantId: string,
  entityType: LeanEventManagedEntityType,
  entityId: string
): Promise<void> {
  if (!isLeanEventDatabaseEnabled()) {
    return;
  }
  const sql = getLeanEventSql();
  if (!sql) {
    return;
  }

  try {
    await sql`
      DELETE FROM lean_event_entities
      WHERE tenant_id = ${tenantId}
        AND entity_type = ${entityType}
        AND id = ${entityId}
    `;
  } catch (error) {
    await reportDbError(`delete:${entityType}:${entityId}`, error);
  }
}
