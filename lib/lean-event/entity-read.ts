/**
 * Cutover letture: Neon JSONB (Fase B) oppure tabelle tipizzate (N3).
 * Fallback Blob/FS su errore o miss.
 */

import type { LeanEventManagedEntityType } from "@/lib/lean-event/entity-lifecycle";
import {
  getManagedEntityFromNeon,
  listManagedEntitiesByPayloadEqFromNeon,
  listManagedEntitiesFromNeon,
  type LeanEventPayloadEqKey,
} from "@/lib/lean-event/entity-db";
import { isLeanEventReadFromNeon } from "@/lib/lean-event/db";
import { isLeanEventReadNormalized } from "@/lib/lean-event/normalized-flags";
import {
  getNormalizedEntity,
  listNormalizedByFk,
  listNormalizedEntities,
} from "@/lib/lean-event/normalized/read";

function logReadFallback(
  context: string,
  reason: "miss" | "error"
): void {
  console.warn(
    JSON.stringify({
      lean_event_neon_read_fallback: { context, reason },
    })
  );
}

export async function readManagedEntityList<T>(
  tenantId: string,
  entityType: LeanEventManagedEntityType,
  fallback: () => Promise<T[]>
): Promise<T[]> {
  if (isLeanEventReadNormalized()) {
    const normalized = await listNormalizedEntities<T>(tenantId, entityType);
    if (normalized.ok) {
      return normalized.data;
    }
    logReadFallback(`listNorm:${entityType}:${tenantId}`, "error");
  }

  if (!isLeanEventReadFromNeon()) {
    return fallback();
  }

  const result = await listManagedEntitiesFromNeon<T>(tenantId, entityType);
  if (result.ok) {
    return result.data;
  }

  logReadFallback(`list:${entityType}:${tenantId}`, "error");
  return fallback();
}

export async function readManagedEntity<T>(
  tenantId: string,
  entityType: LeanEventManagedEntityType,
  entityId: string,
  fallback: () => Promise<T | null>
): Promise<T | null> {
  if (isLeanEventReadNormalized()) {
    const normalized = await getNormalizedEntity<T>(
      tenantId,
      entityType,
      entityId
    );
    if (normalized.ok) {
      if (normalized.data !== null) {
        return normalized.data;
      }
      logReadFallback(`getNorm:${entityType}:${entityId}`, "miss");
      return fallback();
    }
    logReadFallback(`getNorm:${entityType}:${entityId}`, "error");
  }

  if (!isLeanEventReadFromNeon()) {
    return fallback();
  }

  const result = await getManagedEntityFromNeon<T>(
    tenantId,
    entityType,
    entityId
  );
  if (result.ok) {
    if (result.data !== null) {
      return result.data;
    }
    logReadFallback(`get:${entityType}:${entityId}`, "miss");
    return fallback();
  }

  logReadFallback(`get:${entityType}:${entityId}`, "error");
  return fallback();
}

/** Lista SQL-scoped su chiave payload / FK tipizzata. */
export async function readManagedEntityListByPayloadEq<T>(
  tenantId: string,
  entityType: LeanEventManagedEntityType,
  payloadKey: LeanEventPayloadEqKey,
  payloadValue: string,
  fallback: () => Promise<T[]>
): Promise<T[]> {
  if (
    isLeanEventReadNormalized() &&
    (entityType === "assignment" || entityType === "event_supplier_link") &&
    (payloadKey === "eventId" ||
      payloadKey === "contactId" ||
      payloadKey === "supplierId")
  ) {
    const normalized = await listNormalizedByFk<T>(
      tenantId,
      entityType,
      payloadKey,
      payloadValue
    );
    if (normalized.ok) {
      return normalized.data;
    }
    logReadFallback(
      `listByNorm:${entityType}:${payloadKey}:${tenantId}`,
      "error"
    );
  }

  if (!isLeanEventReadFromNeon()) {
    return fallback();
  }

  const result = await listManagedEntitiesByPayloadEqFromNeon<T>(
    tenantId,
    entityType,
    payloadKey,
    payloadValue
  );
  if (result.ok) {
    return result.data;
  }

  logReadFallback(
    `listBy:${entityType}:${payloadKey}:${tenantId}`,
    "error"
  );
  return fallback();
}
