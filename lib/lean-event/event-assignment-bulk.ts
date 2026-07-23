import type {
  LeanEventContact,
  LeanEventSession,
  TenantEventRoleCategory,
} from "@/types/lean-event";

import { listContacts } from "./contacts";
import { contactHasTag } from "./contact-tags";
import {
  createEventContactAssignment,
  listAssignmentsForEvent,
} from "./event-assignments";

export type BulkAssignmentSource =
  | {
      type: "tags";
      tags: string[];
      match: "any" | "all";
    }
  | {
      type: "organization";
      organization: string;
    }
  | {
      type: "past_event";
      sourceEventId: string;
      sourceRoleCategory?: TenantEventRoleCategory;
    }
  | {
      type: "contact_ids";
      contactIds: string[];
    };

export interface BulkAssignmentPreview {
  matched: number;
  alreadyAssigned: number;
  toAdd: number;
  sampleNames: string[];
}

export interface BulkAssignmentResult {
  created: number;
  skipped: number;
  preview: BulkAssignmentPreview;
}

function formatContactLabel(contact: LeanEventContact): string {
  const name = `${contact.firstName} ${contact.lastName}`.trim();
  return name || contact.email || "Contatto";
}

function contactMatchesTags(
  contact: LeanEventContact,
  tags: string[],
  match: "any" | "all"
): boolean {
  const normalizedTags = tags
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
  if (normalizedTags.length === 0) {
    return false;
  }

  if (match === "all") {
    return normalizedTags.every((tag) => contactHasTag(contact, tag));
  }

  return normalizedTags.some((tag) => contactHasTag(contact, tag));
}

function contactMatchesOrganization(
  contact: LeanEventContact,
  organization: string
): boolean {
  const needle = organization.trim().toLowerCase();
  if (!needle) {
    return false;
  }
  return contact.organization.trim().toLowerCase() === needle;
}

export async function resolveBulkAssignmentContactIds(
  tenantId: string,
  source: BulkAssignmentSource
): Promise<string[]> {
  if (source.type === "contact_ids") {
    return [...new Set(source.contactIds.filter(Boolean))];
  }

  if (source.type === "past_event") {
    const assignments = await listAssignmentsForEvent(
      tenantId,
      source.sourceEventId
    );
    const filtered = source.sourceRoleCategory
      ? assignments.filter(
          (assignment) => assignment.roleCategory === source.sourceRoleCategory
        )
      : assignments;

    return [...new Set(filtered.map((assignment) => assignment.contactId))];
  }

  const contacts = await listContacts(tenantId);

  if (source.type === "tags") {
    return contacts
      .filter((contact) =>
        contactMatchesTags(contact, source.tags, source.match)
      )
      .map((contact) => contact.id);
  }

  return contacts
    .filter((contact) =>
      contactMatchesOrganization(contact, source.organization)
    )
    .map((contact) => contact.id);
}

export async function previewBulkEventAssignments(
  tenantId: string,
  eventId: string,
  source: BulkAssignmentSource,
  roleCategory: TenantEventRoleCategory,
  contactsById?: Map<string, LeanEventContact>
): Promise<BulkAssignmentPreview> {
  const contactIds = await resolveBulkAssignmentContactIds(tenantId, source);
  const existing = await listAssignmentsForEvent(tenantId, eventId);
  const existingKeys = new Set(
    existing
      .filter((assignment) => assignment.roleCategory === roleCategory)
      .map((assignment) => assignment.contactId)
  );

  const toAddIds = contactIds.filter((id) => !existingKeys.has(id));
  const contacts =
    contactsById ??
    new Map(
      (await listContacts(tenantId)).map((contact) => [contact.id, contact])
    );

  const sampleNames = toAddIds
    .slice(0, 8)
    .map((id) => {
      const contact = contacts.get(id);
      return contact ? formatContactLabel(contact) : null;
    })
    .filter((name): name is string => Boolean(name));

  return {
    matched: contactIds.length,
    alreadyAssigned: contactIds.length - toAddIds.length,
    toAdd: toAddIds.length,
    sampleNames,
  };
}

export async function applyBulkEventAssignments(
  session: LeanEventSession,
  eventId: string,
  source: BulkAssignmentSource,
  roleCategory: TenantEventRoleCategory,
  notes?: string
): Promise<BulkAssignmentResult> {
  const contactIds = await resolveBulkAssignmentContactIds(
    session.tenantId,
    source
  );
  const existing = await listAssignmentsForEvent(session.tenantId, eventId);
  const existingKeys = new Set(
    existing
      .filter((assignment) => assignment.roleCategory === roleCategory)
      .map((assignment) => assignment.contactId)
  );

  let created = 0;
  let skipped = 0;

  for (const contactId of contactIds) {
    if (existingKeys.has(contactId)) {
      skipped += 1;
      continue;
    }

    try {
      await createEventContactAssignment(session, {
        eventId,
        contactId,
        roleCategory,
        notes,
      });
      existingKeys.add(contactId);
      created += 1;
    } catch (error) {
      if (error instanceof Error && error.message === "ASSIGNMENT_DUPLICATE") {
        skipped += 1;
        continue;
      }
      throw error;
    }
  }

  const preview = await previewBulkEventAssignments(
    session.tenantId,
    eventId,
    source,
    roleCategory
  );

  return { created, skipped, preview };
}
