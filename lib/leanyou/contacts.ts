import { randomUUID } from "node:crypto";

import type { LeanYouContact, LeanYouContactPhone, LeanYouSession } from "@/types/leanyou";

import { normalizeTagsList } from "./contact-tags";
import {
  isEntityActive,
  markEntityDeleted,
  markEntityRestored,
  prepareEntityCreate,
  prepareEntityUpdate,
  assertRevisionMatch,
  sessionUserId,
  withLifecycleDefaults,
} from "./entity-lifecycle";

import {
  findContactByEmail,
  findContactByFiscalCode,
  getStoredContact,
  listStoredContacts,
  saveStoredContact,
} from "./contact-storage";
import { saveEntityVersionSnapshot } from "./version-storage";

function normalizeContact(contact: LeanYouContact): LeanYouContact {
  return withLifecycleDefaults(contact) as LeanYouContact;
}

export async function listContacts(tenantId: string): Promise<LeanYouContact[]> {
  const contacts = await listStoredContacts(tenantId);
  return contacts
    .map((contact) => normalizeContact(contact))
    .filter(isEntityActive)
    .sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "it")
    );
}

export async function listDeletedContacts(
  tenantId: string
): Promise<LeanYouContact[]> {
  const contacts = await listStoredContacts(tenantId);
  return contacts
    .map((contact) => normalizeContact(contact))
    .filter((contact) => !isEntityActive(contact))
    .sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""));
}

export async function getContact(
  tenantId: string,
  contactId: string,
  options?: { includeDeleted?: boolean }
): Promise<LeanYouContact | null> {
  const contact = await getStoredContact(tenantId, contactId);
  if (!contact) {
    return null;
  }
  const normalized = normalizeContact(contact);
  if (!options?.includeDeleted && !isEntityActive(normalized)) {
    return null;
  }
  return normalized;
}

export async function findContactByEmailForTenant(
  tenantId: string,
  email: string
): Promise<LeanYouContact | null> {
  const contact = await findContactByEmail(tenantId, email);
  return contact && isEntityActive(normalizeContact(contact))
    ? normalizeContact(contact)
    : null;
}

export async function findContactByFiscalCodeForTenant(
  tenantId: string,
  fiscalCode: string
): Promise<LeanYouContact | null> {
  const contact = await findContactByFiscalCode(tenantId, fiscalCode);
  return contact && isEntityActive(normalizeContact(contact))
    ? normalizeContact(contact)
    : null;
}

async function persistContact(
  contact: LeanYouContact,
  previous: LeanYouContact | null
): Promise<void> {
  if (previous) {
    await saveEntityVersionSnapshot(
      contact.tenantId,
      "contact",
      contact.id,
      previous.revision ?? 1,
      previous
    );
  }
  await saveStoredContact(contact);
}

export async function saveContact(
  contact: LeanYouContact,
  options?: {
    expectedRevision?: number;
    userId?: string;
    previous?: LeanYouContact | null;
  }
): Promise<LeanYouContact> {
  const normalized = normalizeContact(contact);
  const previous =
    options?.previous ??
    (await getStoredContact(normalized.tenantId, normalized.id));

  if (previous) {
    const prevNorm = normalizeContact(previous);
    assertRevisionMatch(prevNorm, options?.expectedRevision);
    const userId = options?.userId ?? normalized.updatedBy ?? "system";
    const next = prepareEntityUpdate(prevNorm, userId);
    const merged = normalizeContact({
      ...normalized,
      revision: next.revision,
      updatedAt: next.updatedAt!,
      updatedBy: next.updatedBy,
    });
    await persistContact(merged, prevNorm);
    return merged;
  }

  await saveStoredContact(normalized);
  return normalized;
}

export async function deleteContact(
  tenantId: string,
  contactId: string,
  userId: string
): Promise<void> {
  const contact = await getContact(tenantId, contactId, { includeDeleted: true });
  if (!contact) {
    return;
  }
  const deleted = markEntityDeleted(contact, userId);
  await persistContact(deleted, contact);
}

export async function restoreContact(
  tenantId: string,
  contactId: string,
  userId: string
): Promise<LeanYouContact | null> {
  const contact = await getContact(tenantId, contactId, { includeDeleted: true });
  if (!contact || isEntityActive(contact)) {
    return null;
  }
  const restored = markEntityRestored(contact, userId);
  await persistContact(restored, contact);
  return restored;
}

export function createContact(
  session: LeanYouSession,
  input: {
    firstName: string;
    lastName: string;
    email: string;
    fiscalCode?: string;
    phones?: LeanYouContactPhone[];
    organization?: string;
    tags?: string[];
    notes?: string;
  }
): LeanYouContact {
  const now = new Date().toISOString();
  const userId = sessionUserId(session);

  const draft: LeanYouContact = {
    id: randomUUID(),
    tenantId: session.tenantId,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.trim(),
    fiscalCode: input.fiscalCode?.trim().toUpperCase() || undefined,
    phones: input.phones ?? [],
    organization: input.organization?.trim() ?? "",
    tags: normalizeTagsList(input.tags ?? []),
    notes: input.notes?.trim() ?? "",
    createdAt: now,
    updatedAt: now,
  };

  return prepareEntityCreate(normalizeContact(draft), userId);
}
