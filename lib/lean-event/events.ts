import { randomUUID } from "node:crypto";

import type {
  LeanEventSession,
  LeonardoEvent,
  LeonardoEventCategoryId,
  LeonardoEcmModality,
  LeonardoEventStatus,
  LeonardoEventType,
  LeonardoFormationEventTypeId,
} from "@/types/lean-event";

import { normalizeMeetingDateInput } from "./dates";
import {
  assertRevisionMatch,
  isEntityActive,
  markEntityDeleted,
  markEntityRestored,
  prepareEntityCreate,
  prepareEntityUpdate,
  sessionUserId,
  withLifecycleDefaults,
} from "./entity-lifecycle";
import {
  isFormationCategory,
  isHealthFormationCategory,
  normalizeLeonardoEvent,
  validateEventTaxonomy,
} from "./event-taxonomy";
import {
  getStoredEvent,
  listStoredEvents,
  saveStoredEvent,
} from "./event-storage";
import { upsertManagedEntityToNeon } from "./entity-db";
import { saveEntityVersionSnapshot } from "./version-storage";
import {
  auditManagedEntityMutation,
  resolveEntityAuditAction,
} from "./audit-log";

function normalizeStoredEvent(event: LeonardoEvent): LeonardoEvent {
  return normalizeLeonardoEvent(withLifecycleDefaults(event) as LeonardoEvent);
}

export async function listEvents(tenantId: string): Promise<LeonardoEvent[]> {
  const events = await listStoredEvents(tenantId);
  return events
    .map((event) => normalizeStoredEvent(event))
    .filter(isEntityActive)
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
}

export async function listDeletedEvents(
  tenantId: string
): Promise<LeonardoEvent[]> {
  const events = await listStoredEvents(tenantId);
  return events
    .map((event) => normalizeStoredEvent(event))
    .filter((event) => !isEntityActive(event))
    .sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""));
}

export async function getEvent(
  tenantId: string,
  eventId: string,
  options?: { includeDeleted?: boolean }
): Promise<LeonardoEvent | null> {
  const event = await getStoredEvent(tenantId, eventId);
  if (!event) {
    return null;
  }
  const normalized = normalizeStoredEvent(event);
  if (!options?.includeDeleted && !isEntityActive(normalized)) {
    return null;
  }
  return normalized;
}

async function persistEvent(
  event: LeonardoEvent,
  previous: LeonardoEvent | null
): Promise<void> {
  if (previous) {
    await saveEntityVersionSnapshot(
      event.tenantId,
      "event",
      event.id,
      previous.revision ?? 1,
      previous
    );
  }
  await saveStoredEvent(event);
  await upsertManagedEntityToNeon("event", event);
  await auditManagedEntityMutation({
    tenantId: event.tenantId,
    entityType: "event",
    entityId: event.id,
    action: resolveEntityAuditAction(previous, event),
    userId: event.updatedBy,
  });
}

export async function saveEvent(
  event: LeonardoEvent,
  options?: {
    expectedRevision?: number;
    userId?: string;
    previous?: LeonardoEvent | null;
  }
): Promise<LeonardoEvent> {
  const normalized = normalizeStoredEvent(event);
  const previous =
    options?.previous ??
    (await getStoredEvent(normalized.tenantId, normalized.id));

  if (previous) {
    const prevNorm = normalizeStoredEvent(previous);
    assertRevisionMatch(prevNorm, options?.expectedRevision);
    const userId = options?.userId ?? normalized.updatedBy ?? "system";
    const next = prepareEntityUpdate(prevNorm, userId);
    const merged = normalizeStoredEvent({
      ...normalized,
      revision: next.revision,
      updatedAt: next.updatedAt,
      updatedBy: next.updatedBy,
    });
    await persistEvent(merged, prevNorm);
    return merged;
  }

  await persistEvent(normalized, null);
  return normalized;
}

export async function deleteEvent(
  tenantId: string,
  eventId: string,
  userId: string
): Promise<void> {
  const event = await getEvent(tenantId, eventId, { includeDeleted: true });
  if (!event) {
    return;
  }
  const deleted = markEntityDeleted(event, userId);
  await persistEvent(deleted, event);
}

export async function restoreEvent(
  tenantId: string,
  eventId: string,
  userId: string
): Promise<LeonardoEvent | null> {
  const event = await getEvent(tenantId, eventId, { includeDeleted: true });
  if (!event || isEntityActive(event)) {
    return null;
  }
  const restored = markEntityRestored(event, userId);
  await persistEvent(restored, event);
  return restored;
}

export function createEvent(
  session: LeanEventSession,
  input: {
    cdc: string;
    title: string;
    venue: string;
    venueId?: string | null;
    venueDetails?: LeonardoEvent["venueDetails"];
    startDate: string;
    endDate: string;
    categoryId?: LeonardoEventCategoryId;
    healthAreaId?: string | null;
    ecmEnabled?: boolean | null;
    ecmModality?: LeonardoEcmModality | null;
    formationEventTypeId?: LeonardoFormationEventTypeId | null;
    formationStructureName?: string | null;
    type?: LeonardoEventType;
    status?: LeonardoEventStatus;
    notes?: string;
    projectLeaderUserId?: string | null;
    projectManagerUserIds?: string[];
  }
): LeonardoEvent {
  const now = new Date().toISOString();
  const userId = sessionUserId(session);
  const startDate = normalizeMeetingDateInput(input.startDate);
  const endDate = normalizeMeetingDateInput(input.endDate || input.startDate);
  const categoryId =
    input.categoryId ??
    (input.type === "ecm" ? "formazione_sanitaria" : "evento_aziendale");

  const taxonomyError = validateEventTaxonomy({
    categoryId,
    healthAreaId: input.healthAreaId ?? null,
    ecmEnabled:
      input.ecmEnabled ??
      (isHealthFormationCategory(categoryId) ? null : false),
    ecmModality: input.ecmModality ?? null,
    formationEventTypeId: input.formationEventTypeId ?? null,
    formationStructureName: input.formationStructureName ?? null,
  });
  if (taxonomyError) {
    throw new Error(`INVALID_EVENT_TAXONOMY:${taxonomyError}`);
  }

  const ecmEnabled =
    input.ecmEnabled ??
    (isHealthFormationCategory(categoryId) ? null : false);

  const draft = normalizeLeonardoEvent({
    id: randomUUID(),
    tenantId: session.tenantId,
    createdBy: session.userId,
    cdc: input.cdc.trim(),
    title: input.title.trim(),
    venue: input.venue.trim(),
    venueId: input.venueId ?? null,
    venueDetails: input.venueDetails,
    startDate,
    endDate,
    categoryId,
    healthAreaId: isHealthFormationCategory(categoryId)
      ? input.healthAreaId ?? null
      : null,
    ecmEnabled,
    ecmModality: isFormationCategory(categoryId)
      ? input.ecmModality ?? null
      : null,
    formationEventTypeId: isFormationCategory(categoryId)
      ? input.formationEventTypeId ?? null
      : null,
    formationStructureName: isFormationCategory(categoryId)
      ? input.formationStructureName ?? null
      : null,
    type: ecmEnabled ? "ecm" : "base",
    status: input.status ?? "draft",
    notes: input.notes?.trim() ?? "",
    projectLeaderUserId: input.projectLeaderUserId ?? null,
    projectManagerUserIds: input.projectManagerUserIds ?? [],
    createdAt: now,
    updatedAt: now,
  });

  return prepareEntityCreate(withLifecycleDefaults(draft) as LeonardoEvent, userId);
}

export function getEventDashboardStats(events: LeonardoEvent[]) {
  return {
    total: events.length,
    active: events.filter((event) => event.status === "active").length,
    draft: events.filter((event) => event.status === "draft").length,
    completed: events.filter((event) => event.status === "completed").length,
  };
}
