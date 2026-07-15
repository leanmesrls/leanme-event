import { randomUUID } from "node:crypto";

import type { LeanEventContact, LeanEventContactPhone, LeanEventSession } from "@/types/lean-event";

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
import { upsertManagedEntityToNeon } from "./entity-db";
import { saveEntityVersionSnapshot } from "./version-storage";

function normalizeContact(contact: LeanEventContact): LeanEventContact {
  return withLifecycleDefaults(contact) as LeanEventContact;
}

export async function listContacts(tenantId: string): Promise<LeanEventContact[]> {
  const contacts = await listStoredContacts(tenantId);
  const active = contacts
    .map((contact) => normalizeContact(contact))
    .filter(isEntityActive);

  const deduped = dedupeContactsByEmail(active);

  return deduped.sort((a, b) =>
    `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "it")
  );
}

/** Keeps the newest row when parallel creates wrote duplicate emails. */
function dedupeContactsByEmail(contacts: LeanEventContact[]): LeanEventContact[] {
  const withoutEmail: LeanEventContact[] = [];
  const byEmail = new Map<string, LeanEventContact>();

  for (const contact of contacts) {
    const emailKey = contact.email.trim().toLowerCase();
    if (!emailKey) {
      withoutEmail.push(contact);
      continue;
    }
    const existing = byEmail.get(emailKey);
    if (!existing || contact.updatedAt.localeCompare(existing.updatedAt) > 0) {
      byEmail.set(emailKey, contact);
    }
  }

  return [...withoutEmail, ...byEmail.values()];
}

export async function listDeletedContacts(
  tenantId: string
): Promise<LeanEventContact[]> {
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
): Promise<LeanEventContact | null> {
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
): Promise<LeanEventContact | null> {
  const contact = await findContactByEmail(tenantId, email);
  return contact && isEntityActive(normalizeContact(contact))
    ? normalizeContact(contact)
    : null;
}

export async function findContactByFiscalCodeForTenant(
  tenantId: string,
  fiscalCode: string
): Promise<LeanEventContact | null> {
  const contact = await findContactByFiscalCode(tenantId, fiscalCode);
  return contact && isEntityActive(normalizeContact(contact))
    ? normalizeContact(contact)
    : null;
}

async function persistContact(
  contact: LeanEventContact,
  previous: LeanEventContact | null
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
  await upsertManagedEntityToNeon("contact", contact);
}

export async function saveContact(
  contact: LeanEventContact,
  options?: {
    expectedRevision?: number;
    userId?: string;
    previous?: LeanEventContact | null;
  }
): Promise<LeanEventContact> {
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

  await persistContact(normalized, null);
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
): Promise<LeanEventContact | null> {
  const contact = await getContact(tenantId, contactId, { includeDeleted: true });
  if (!contact || isEntityActive(contact)) {
    return null;
  }
  const restored = markEntityRestored(contact, userId);
  await persistContact(restored, contact);
  return restored;
}

export function createContact(
  session: LeanEventSession,
  input: {
    firstName: string;
    lastName: string;
    email: string;
    fiscalCode?: string;
    phones?: LeanEventContactPhone[];
    organization?: string;
    tags?: string[];
    notes?: string;
  }
): LeanEventContact {
  const now = new Date().toISOString();
  const userId = sessionUserId(session);

  const draft: LeanEventContact = {
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
