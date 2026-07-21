/**
 * Dual-write Neon per entità gestite (Fase B).
 * Blob/FS resta source of truth per le letture finché non c’è cutover;
 * ogni mutazione upserta anche su Postgres.
 */

import type { LeanEventManagedEntityType } from "@/lib/lean-event/entity-lifecycle";
import {
  LEAN_EVENT_VERSION_KEEP_DAYS,
  LEAN_EVENT_VERSION_KEEP_LAST,
} from "@/lib/lean-event/entity-lifecycle";
import {
  getLeanEventSql,
  isLeanEventDatabaseEnabled,
  isLeanEventDatabaseStrict,
} from "@/lib/lean-event/db";
import {
  isLeanEventLegacyEntityMirror,
  isLeanEventNormalizedSot,
} from "@/lib/lean-event/normalized-flags";
import { upsertNormalizedManagedEntity } from "@/lib/lean-event/normalized/write";

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

/**
 * Upsert entità su Neon.
 * - Default / legacy: `lean_event_entities` JSONB
 * - Con `LEAN_EVENT_NORMALIZED_SOT=1`: tabelle tipizzate (+ mirror JSONB se abilitato)
 */
export async function upsertManagedEntityToNeon(
  entityType: LeanEventManagedEntityType,
  entity: LeanEventDbEntityRow
): Promise<void> {
  if (!isLeanEventDatabaseEnabled()) {
    return;
  }

  const normalizedSot = isLeanEventNormalizedSot();
  if (normalizedSot) {
    await upsertNormalizedManagedEntity(
      entityType,
      entity as unknown as import("@/lib/lean-event/normalized/write").NormalizedEntityInput,
      { force: true }
    );
  }

  const writeLegacy =
    !normalizedSot || isLeanEventLegacyEntityMirror();
  if (!writeLegacy) {
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

    await pruneManagedEntityVersionsInNeon(tenantId, entityType, entityId);
  } catch (error) {
    await reportDbError(
      `version:${entityType}:${entityId}:r${revision}`,
      error
    );
  }
}

/**
 * Elimina revisioni oltre policy: non tra le ultime KEEP_LAST e più vecchie di KEEP_DAYS.
 * Non fallisce la mutazione chiamante.
 */
export async function pruneManagedEntityVersionsInNeon(
  tenantId: string,
  entityType: LeanEventManagedEntityType,
  entityId: string,
  options?: { keepLast?: number; keepDays?: number }
): Promise<number> {
  if (!isLeanEventDatabaseEnabled()) {
    return 0;
  }
  const sql = getLeanEventSql();
  if (!sql) {
    return 0;
  }

  const keepLast = options?.keepLast ?? LEAN_EVENT_VERSION_KEEP_LAST;
  const keepDays = options?.keepDays ?? LEAN_EVENT_VERSION_KEEP_DAYS;
  const cutoffIso = new Date(
    Date.now() - keepDays * 24 * 60 * 60 * 1000
  ).toISOString();

  try {
    const result = await sql`
      WITH ranked AS (
        SELECT
          id,
          revision,
          changed_at,
          ROW_NUMBER() OVER (ORDER BY revision DESC) AS rn
        FROM lean_event_entity_versions
        WHERE tenant_id = ${tenantId}
          AND entity_type = ${entityType}
          AND entity_id = ${entityId}
      ),
      doomed AS (
        SELECT id
        FROM ranked
        WHERE rn > ${keepLast}
          AND changed_at < ${cutoffIso}::timestamptz
      )
      DELETE FROM lean_event_entity_versions v
      USING doomed
      WHERE v.id = doomed.id
      RETURNING v.id
    `;
    return result.length;
  } catch (error) {
    await reportDbError(`versions:prune:${entityType}:${entityId}`, error);
    return 0;
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

type NeonReadResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "disabled" | "error" };

/** Chiavi payload ammesse per liste SQL-scoped (anti-injection + indici noti). */
export type LeanEventPayloadEqKey =
  | "eventId"
  | "contactId"
  | "supplierId"
  | "linkedEventId";

/** Lista entità (inclusi record in cestino) dal payload JSONB. */
export async function listManagedEntitiesFromNeon<T>(
  tenantId: string,
  entityType: LeanEventManagedEntityType
): Promise<NeonReadResult<T[]>> {
  if (!isLeanEventDatabaseEnabled()) {
    return { ok: false, reason: "disabled" };
  }
  const sql = getLeanEventSql();
  if (!sql) {
    return { ok: false, reason: "disabled" };
  }

  try {
    const rows = await sql`
      SELECT payload
      FROM lean_event_entities
      WHERE tenant_id = ${tenantId}
        AND entity_type = ${entityType}
      ORDER BY updated_at DESC
    `;
    const data = rows
      .map((row) => row.payload as T)
      .filter((entity): entity is T => Boolean(entity));
    return { ok: true, data };
  } catch (error) {
    await reportDbError(`list:${entityType}:${tenantId}`, error);
    return { ok: false, reason: "error" };
  }
}

/**
 * Lista filtrata su una chiave payload (usa indici L1 expression).
 * Di default solo record attivi (`deleted_at IS NULL`).
 */
export async function listManagedEntitiesByPayloadEqFromNeon<T>(
  tenantId: string,
  entityType: LeanEventManagedEntityType,
  payloadKey: LeanEventPayloadEqKey,
  payloadValue: string,
  options?: { includeDeleted?: boolean }
): Promise<NeonReadResult<T[]>> {
  if (!isLeanEventDatabaseEnabled()) {
    return { ok: false, reason: "disabled" };
  }
  const sql = getLeanEventSql();
  if (!sql) {
    return { ok: false, reason: "disabled" };
  }

  const includeDeleted = options?.includeDeleted === true;

  try {
    let rows: Array<{ payload: unknown }> = [];
    switch (payloadKey) {
      case "eventId":
        rows = (includeDeleted
          ? await sql`
              SELECT payload FROM lean_event_entities
              WHERE tenant_id = ${tenantId}
                AND entity_type = ${entityType}
                AND payload->>'eventId' = ${payloadValue}
              ORDER BY updated_at DESC
            `
          : await sql`
              SELECT payload FROM lean_event_entities
              WHERE tenant_id = ${tenantId}
                AND entity_type = ${entityType}
                AND deleted_at IS NULL
                AND payload->>'eventId' = ${payloadValue}
              ORDER BY updated_at DESC
            `) as Array<{ payload: unknown }>;
        break;
      case "contactId":
        rows = (includeDeleted
          ? await sql`
              SELECT payload FROM lean_event_entities
              WHERE tenant_id = ${tenantId}
                AND entity_type = ${entityType}
                AND payload->>'contactId' = ${payloadValue}
              ORDER BY updated_at DESC
            `
          : await sql`
              SELECT payload FROM lean_event_entities
              WHERE tenant_id = ${tenantId}
                AND entity_type = ${entityType}
                AND deleted_at IS NULL
                AND payload->>'contactId' = ${payloadValue}
              ORDER BY updated_at DESC
            `) as Array<{ payload: unknown }>;
        break;
      case "supplierId":
        rows = (includeDeleted
          ? await sql`
              SELECT payload FROM lean_event_entities
              WHERE tenant_id = ${tenantId}
                AND entity_type = ${entityType}
                AND payload->>'supplierId' = ${payloadValue}
              ORDER BY updated_at DESC
            `
          : await sql`
              SELECT payload FROM lean_event_entities
              WHERE tenant_id = ${tenantId}
                AND entity_type = ${entityType}
                AND deleted_at IS NULL
                AND payload->>'supplierId' = ${payloadValue}
              ORDER BY updated_at DESC
            `) as Array<{ payload: unknown }>;
        break;
      case "linkedEventId":
        rows = (includeDeleted
          ? await sql`
              SELECT payload FROM lean_event_entities
              WHERE tenant_id = ${tenantId}
                AND entity_type = ${entityType}
                AND payload->>'linkedEventId' = ${payloadValue}
              ORDER BY updated_at DESC
            `
          : await sql`
              SELECT payload FROM lean_event_entities
              WHERE tenant_id = ${tenantId}
                AND entity_type = ${entityType}
                AND deleted_at IS NULL
                AND payload->>'linkedEventId' = ${payloadValue}
              ORDER BY updated_at DESC
            `) as Array<{ payload: unknown }>;
        break;
      default: {
        const _exhaustive: never = payloadKey;
        void _exhaustive;
        return { ok: false, reason: "error" };
      }
    }

    const data = rows
      .map((row) => row.payload as T)
      .filter((entity): entity is T => Boolean(entity));
    return { ok: true, data };
  } catch (error) {
    await reportDbError(
      `listBy:${entityType}:${payloadKey}:${tenantId}`,
      error
    );
    return { ok: false, reason: "error" };
  }
}

/** Eventi preferiti (colonna L2 `is_favorite` — richiede migrazione 005). */
export async function listFavoriteEventsFromNeon<T>(
  tenantId: string
): Promise<NeonReadResult<T[]>> {
  if (!isLeanEventDatabaseEnabled()) {
    return { ok: false, reason: "disabled" };
  }
  const sql = getLeanEventSql();
  if (!sql) {
    return { ok: false, reason: "disabled" };
  }

  try {
    const rows = await sql`
      SELECT payload
      FROM lean_event_entities
      WHERE tenant_id = ${tenantId}
        AND entity_type = 'event'
        AND deleted_at IS NULL
        AND is_favorite = true
      ORDER BY updated_at DESC
    `;
    const data = rows
      .map((row) => row.payload as T)
      .filter((entity): entity is T => Boolean(entity));
    return { ok: true, data };
  } catch (error) {
    await reportDbError(`listFavorites:event:${tenantId}`, error);
    return { ok: false, reason: "error" };
  }
}

/** Singola entità per id (null se assente). */
export async function getManagedEntityFromNeon<T>(
  tenantId: string,
  entityType: LeanEventManagedEntityType,
  entityId: string
): Promise<NeonReadResult<T | null>> {
  if (!isLeanEventDatabaseEnabled()) {
    return { ok: false, reason: "disabled" };
  }
  const sql = getLeanEventSql();
  if (!sql) {
    return { ok: false, reason: "disabled" };
  }

  try {
    const rows = await sql`
      SELECT payload
      FROM lean_event_entities
      WHERE tenant_id = ${tenantId}
        AND entity_type = ${entityType}
        AND id = ${entityId}
      LIMIT 1
    `;
    const payload = rows[0]?.payload as T | undefined;
    return { ok: true, data: payload ?? null };
  } catch (error) {
    await reportDbError(`get:${entityType}:${entityId}`, error);
    return { ok: false, reason: "error" };
  }
}

export interface LeanEventNeonVersionRow {
  revision: number;
  changedBy: string;
  changedAt: string;
  changeSummary: string | null;
  snapshot?: unknown;
}

/** Metadati versioni (senza snapshot completo). */
export async function listManagedEntityVersionsFromNeon(
  tenantId: string,
  entityType: LeanEventManagedEntityType,
  entityId: string
): Promise<NeonReadResult<LeanEventNeonVersionRow[]>> {
  if (!isLeanEventDatabaseEnabled()) {
    return { ok: false, reason: "disabled" };
  }
  const sql = getLeanEventSql();
  if (!sql) {
    return { ok: false, reason: "disabled" };
  }

  try {
    const rows = await sql`
      SELECT
        revision,
        changed_by,
        changed_at,
        change_summary
      FROM lean_event_entity_versions
      WHERE tenant_id = ${tenantId}
        AND entity_type = ${entityType}
        AND entity_id = ${entityId}
      ORDER BY revision DESC
      LIMIT ${LEAN_EVENT_VERSION_KEEP_LAST}
    `;
    return {
      ok: true,
      data: rows.map((row) => ({
        revision: Number(row.revision),
        changedBy: String(row.changed_by ?? "system"),
        changedAt:
          row.changed_at instanceof Date
            ? row.changed_at.toISOString()
            : String(row.changed_at),
        changeSummary:
          typeof row.change_summary === "string" ? row.change_summary : null,
      })),
    };
  } catch (error) {
    await reportDbError(`versions:list:${entityType}:${entityId}`, error);
    return { ok: false, reason: "error" };
  }
}

/** Snapshot di una revisione specifica. */
export async function getManagedEntityVersionFromNeon(
  tenantId: string,
  entityType: LeanEventManagedEntityType,
  entityId: string,
  revision: number
): Promise<NeonReadResult<LeanEventNeonVersionRow | null>> {
  if (!isLeanEventDatabaseEnabled()) {
    return { ok: false, reason: "disabled" };
  }
  const sql = getLeanEventSql();
  if (!sql) {
    return { ok: false, reason: "disabled" };
  }

  try {
    const rows = await sql`
      SELECT
        revision,
        changed_by,
        changed_at,
        change_summary,
        snapshot
      FROM lean_event_entity_versions
      WHERE tenant_id = ${tenantId}
        AND entity_type = ${entityType}
        AND entity_id = ${entityId}
        AND revision = ${revision}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) {
      return { ok: true, data: null };
    }
    return {
      ok: true,
      data: {
        revision: Number(row.revision),
        changedBy: String(row.changed_by ?? "system"),
        changedAt:
          row.changed_at instanceof Date
            ? row.changed_at.toISOString()
            : String(row.changed_at),
        changeSummary:
          typeof row.change_summary === "string" ? row.change_summary : null,
        snapshot: row.snapshot,
      },
    };
  } catch (error) {
    await reportDbError(
      `versions:get:${entityType}:${entityId}:r${revision}`,
      error
    );
    return { ok: false, reason: "error" };
  }
}
