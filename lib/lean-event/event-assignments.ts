import { randomUUID } from "node:crypto";

import eventsConfig from "@/data/lean-event/events-config.json";
import type {
  LeanEventContact,
  LeanEventSession,
  LeonardoAssignmentHospitality,
  LeonardoEventContactAssignment,
  LeonardoEventHotelBlock,
  LeonardoEventRoleCategory,
  LeonardoRelatedEventParticipation,
} from "@/types/lean-event";

import { getContact } from "./contacts";
import { formatContactName } from "./contact-display";
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
import { getEvent } from "./events";
import { normalizeAssignmentHospitality } from "./hospitality";
import {
  hospitalityRoomAllotmentsChanged,
  reconcileHospitalityWithHotelBlocks,
} from "./assignment-hotel-reconcile";
import { normalizeRelatedParticipations } from "./related-events";
import {
  getStoredAssignment,
  listStoredAssignments,
  saveStoredAssignment,
} from "./event-assignment-storage";
import { saveEntityVersionSnapshot } from "./version-storage";

const roleCategories = eventsConfig.roleCategories as Array<{
  id: LeonardoEventRoleCategory;
  label: string;
}>;

function normalizeAssignment(
  assignment: LeonardoEventContactAssignment
): LeonardoEventContactAssignment {
  return withLifecycleDefaults(
    assignment
  ) as LeonardoEventContactAssignment;
}

export function getEventRoleCategoryLabel(
  roleCategory: LeonardoEventRoleCategory
): string {
  if (roleCategory === "staff") {
    return "Staff interno";
  }
  return (
    roleCategories.find((item) => item.id === roleCategory)?.label ?? roleCategory
  );
}

export function listEventRoleCategories() {
  return roleCategories;
}

export async function listDeletedAssignments(
  tenantId: string
): Promise<LeonardoEventContactAssignment[]> {
  const assignments = await listStoredAssignments(tenantId);
  return assignments
    .map((assignment) => normalizeAssignment(assignment))
    .filter((assignment) => !isEntityActive(assignment))
    .sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""));
}

async function findStoredAssignmentByIdentity(
  tenantId: string,
  eventId: string,
  contactId: string,
  roleCategory: LeonardoEventRoleCategory
): Promise<LeonardoEventContactAssignment | null> {
  const assignments = await listStoredAssignments(tenantId);
  const match = assignments
    .map((assignment) => normalizeAssignment(assignment))
    .find(
      (assignment) =>
        assignment.eventId === eventId &&
        assignment.contactId === contactId &&
        assignment.roleCategory === roleCategory
    );
  return match ?? null;
}

export async function listAssignmentsForEvent(
  tenantId: string,
  eventId: string
): Promise<LeonardoEventContactAssignment[]> {
  const assignments = await listStoredAssignments(tenantId);
  return assignments
    .map((assignment) => normalizeAssignment(assignment))
    .filter(
      (assignment) =>
        assignment.eventId === eventId && isEntityActive(assignment)
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listAssignmentsForContact(
  tenantId: string,
  contactId: string
): Promise<LeonardoEventContactAssignment[]> {
  const assignments = await listStoredAssignments(tenantId);
  return assignments
    .map((assignment) => normalizeAssignment(assignment))
    .filter(
      (assignment) =>
        assignment.contactId === contactId && isEntityActive(assignment)
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getAssignment(
  tenantId: string,
  assignmentId: string,
  options?: { includeDeleted?: boolean }
): Promise<LeonardoEventContactAssignment | null> {
  const assignment = await getStoredAssignment(tenantId, assignmentId);
  if (!assignment) {
    return null;
  }
  const normalized = normalizeAssignment(assignment);
  if (!options?.includeDeleted && !isEntityActive(normalized)) {
    return null;
  }
  return normalized;
}

export function isValidRoleCategory(
  value: string
): value is LeonardoEventRoleCategory {
  if (value === "staff") {
    return true;
  }
  return roleCategories.some((item) => item.id === value);
}

async function persistAssignment(
  assignment: LeonardoEventContactAssignment,
  previous: LeonardoEventContactAssignment | null
): Promise<void> {
  if (previous) {
    await saveEntityVersionSnapshot(
      assignment.tenantId,
      "assignment",
      assignment.id,
      previous.revision ?? 1,
      previous
    );
  }
  await saveStoredAssignment(assignment);
}

export async function createEventContactAssignment(
  session: LeanEventSession,
  input: {
    eventId: string;
    contactId: string;
    roleCategory: LeonardoEventRoleCategory;
    notes?: string;
    hospitality?: LeonardoAssignmentHospitality;
  }
): Promise<LeonardoEventContactAssignment> {
  const contact = await getContact(session.tenantId, input.contactId);
  if (!contact) {
    throw new Error("CONTACT_NOT_FOUND");
  }

  const userId = sessionUserId(session);
  const storedMatch = await findStoredAssignmentByIdentity(
    session.tenantId,
    input.eventId,
    input.contactId,
    input.roleCategory
  );

  if (storedMatch && isEntityActive(storedMatch)) {
    throw new Error("ASSIGNMENT_DUPLICATE");
  }

  if (storedMatch && !isEntityActive(storedMatch)) {
    const restored = markEntityRestored(storedMatch, userId);
    const merged: LeonardoEventContactAssignment = {
      ...restored,
      notes:
        input.notes !== undefined ? input.notes.trim() : restored.notes,
      hospitality:
        input.hospitality !== undefined
          ? normalizeAssignmentHospitality(input.hospitality)
          : normalizeAssignmentHospitality(restored.hospitality),
    };
    const updated = prepareEntityUpdate(merged, userId);
    const assignment: LeonardoEventContactAssignment = {
      ...merged,
      revision: updated.revision,
      updatedAt: updated.updatedAt!,
      updatedBy: updated.updatedBy,
    };
    await persistAssignment(assignment, storedMatch);
    return assignment;
  }

  const now = new Date().toISOString();
  const draft: LeonardoEventContactAssignment = {
    id: randomUUID(),
    tenantId: session.tenantId,
    eventId: input.eventId,
    contactId: input.contactId,
    roleCategory: input.roleCategory,
    notes: input.notes?.trim() ?? "",
    hospitality: normalizeAssignmentHospitality(input.hospitality),
    relatedParticipations: [],
    createdAt: now,
    updatedAt: now,
  };

  const assignment = prepareEntityCreate(
    normalizeAssignment(draft),
    userId
  );
  await persistAssignment(assignment, null);
  return assignment;
}

export async function deleteEventContactAssignment(
  tenantId: string,
  assignmentId: string,
  userId: string
): Promise<void> {
  const assignment = await getAssignment(tenantId, assignmentId, {
    includeDeleted: true,
  });
  if (!assignment) {
    throw new Error("ASSIGNMENT_NOT_FOUND");
  }
  if (!isEntityActive(assignment)) {
    throw new Error("ASSIGNMENT_ALREADY_DELETED");
  }

  const deleted = markEntityDeleted(assignment, userId);
  await persistAssignment(deleted, assignment);

  const verified = await getStoredAssignment(tenantId, assignmentId);
  if (!verified?.deletedAt) {
    throw new Error("ASSIGNMENT_DELETE_FAILED");
  }
}

export async function reconcileEventAssignmentsWithHotelBlocks(
  tenantId: string,
  eventId: string,
  hotelBlocks: LeonardoEventHotelBlock[],
  userId: string
): Promise<number> {
  const assignments = await listAssignmentsForEvent(tenantId, eventId);
  let updatedCount = 0;

  for (const assignment of assignments) {
    const reconciled = reconcileHospitalityWithHotelBlocks(
      assignment.hospitality,
      hotelBlocks
    );
    if (!hospitalityRoomAllotmentsChanged(assignment.hospitality, reconciled)) {
      continue;
    }

    const merged: LeonardoEventContactAssignment = {
      ...assignment,
      hospitality: reconciled,
    };
    const next = prepareEntityUpdate(merged, userId);
    const updated: LeonardoEventContactAssignment = {
      ...merged,
      revision: next.revision,
      updatedAt: next.updatedAt!,
      updatedBy: next.updatedBy,
    };
    await persistAssignment(updated, assignment);
    updatedCount += 1;
  }

  return updatedCount;
}

export async function restoreEventContactAssignment(
  tenantId: string,
  assignmentId: string,
  userId: string
): Promise<LeonardoEventContactAssignment | null> {
  const assignment = await getAssignment(tenantId, assignmentId, {
    includeDeleted: true,
  });
  if (!assignment || isEntityActive(assignment)) {
    return null;
  }

  const activeDuplicate = await findStoredAssignmentByIdentity(
    tenantId,
    assignment.eventId,
    assignment.contactId,
    assignment.roleCategory
  );
  if (
    activeDuplicate &&
    activeDuplicate.id !== assignment.id &&
    isEntityActive(activeDuplicate)
  ) {
    throw new Error("ASSIGNMENT_DUPLICATE");
  }

  const restored = markEntityRestored(assignment, userId);
  const updated = prepareEntityUpdate(restored, userId);
  const next: LeonardoEventContactAssignment = {
    ...restored,
    revision: updated.revision,
    updatedAt: updated.updatedAt!,
    updatedBy: updated.updatedBy,
  };
  await persistAssignment(next, assignment);
  return next;
}

export async function updateEventContactAssignment(
  tenantId: string,
  assignmentId: string,
  input: {
    notes?: string;
    hospitality?: LeonardoAssignmentHospitality;
    relatedParticipations?: LeonardoRelatedEventParticipation[];
    expectedRevision?: number;
    userId?: string;
  }
): Promise<LeonardoEventContactAssignment> {
  const assignment = await getAssignment(tenantId, assignmentId);
  if (!assignment) {
    throw new Error("ASSIGNMENT_NOT_FOUND");
  }

  assertRevisionMatch(assignment, input.expectedRevision);

  const event = await getEvent(tenantId, assignment.eventId);
  const relatedEvents = event?.relatedEvents ?? [];

  const merged: LeonardoEventContactAssignment = {
    ...assignment,
    notes: input.notes !== undefined ? input.notes.trim() : assignment.notes,
    hospitality:
      input.hospitality !== undefined
        ? normalizeAssignmentHospitality(input.hospitality)
        : normalizeAssignmentHospitality(assignment.hospitality),
    relatedParticipations:
      input.relatedParticipations !== undefined
        ? normalizeRelatedParticipations(
            relatedEvents,
            input.relatedParticipations
          )
        : normalizeRelatedParticipations(
            relatedEvents,
            assignment.relatedParticipations
          ),
  };

  const userId = input.userId ?? assignment.updatedBy ?? "system";
  const next = prepareEntityUpdate(merged, userId);
  const updated: LeonardoEventContactAssignment = {
    ...merged,
    revision: next.revision,
    updatedAt: next.updatedAt!,
    updatedBy: next.updatedBy,
  };

  await persistAssignment(updated, assignment);
  return updated;
}

export type ContactAssignmentWithEvent = LeonardoEventContactAssignment & {
  eventTitle: string;
  roleLabel: string;
};

export async function listAssignmentsForContactWithEvents(
  tenantId: string,
  contactId: string
): Promise<ContactAssignmentWithEvent[]> {
  const assignments = await listAssignmentsForContact(tenantId, contactId);
  const enriched = await Promise.all(
    assignments.map(async (assignment) => {
      const event = await getEvent(tenantId, assignment.eventId);
      return {
        ...assignment,
        eventTitle: event?.title ?? "Evento",
        roleLabel: getEventRoleCategoryLabel(assignment.roleCategory),
      };
    })
  );
  return enriched;
}

export type EventAssignmentWithContact = LeonardoEventContactAssignment & {
  contact: LeanEventContact;
  contactName: string;
  roleLabel: string;
};

export async function listAssignmentsForEventWithContacts(
  tenantId: string,
  eventId: string
): Promise<EventAssignmentWithContact[]> {
  const assignments = await listAssignmentsForEvent(tenantId, eventId);
  const enriched = await Promise.all(
    assignments.map(async (assignment) => {
      const contact = await getContact(tenantId, assignment.contactId);
      if (!contact) {
        return null;
      }
      return {
        ...assignment,
        contact,
        contactName: formatContactName(contact),
        roleLabel: getEventRoleCategoryLabel(assignment.roleCategory),
      };
    })
  );
  return enriched.filter(
    (item): item is EventAssignmentWithContact => item !== null
  );
}
