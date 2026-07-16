/**
 * Cutover letture Fase B: Neon first, fallback Blob/FS su errore o miss.
 */

import type { LeanEventManagedEntityType } from "@/lib/lean-event/entity-lifecycle";
import {
  getManagedEntityFromNeon,
  listManagedEntitiesFromNeon,
} from "@/lib/lean-event/entity-db";
import { isLeanEventReadFromNeon } from "@/lib/lean-event/db";

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
