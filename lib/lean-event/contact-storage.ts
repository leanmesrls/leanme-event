import path from "node:path";

import type { LeanEventContact } from "@/types/lean-event";

import { createEntityBlobStore, isEntityBlobStorageEnabled } from "./entity-blob-storage";
import { readManagedEntity, readManagedEntityList } from "./entity-read";
import {
  deleteJsonFile,
  getDataRoot,
  listJsonFiles,
  readJsonFile,
  writeJsonFile,
} from "./storage";

const BLOB_ROOT = "lean-event/contacts";
const contactBlob = createEntityBlobStore(BLOB_ROOT);

export function getContactDir(tenantId: string): string {
  return path.join(getDataRoot(), "contacts", tenantId);
}

export function getContactFilePath(tenantId: string, contactId: string): string {
  return path.join(getContactDir(tenantId), `${contactId}.json`);
}

async function listContactsFromBlobOrFs(
  tenantId: string
): Promise<LeanEventContact[]> {
  if (isEntityBlobStorageEnabled()) {
    return contactBlob.listAll<LeanEventContact>(tenantId);
  }

  const dir = getContactDir(tenantId);
  const files = await listJsonFiles(dir);
  const contacts = await Promise.all(
    files.map((file) => readJsonFile<LeanEventContact>(`${dir}/${file}`))
  );
  return contacts.filter((contact): contact is LeanEventContact => Boolean(contact));
}

async function getContactFromBlobOrFs(
  tenantId: string,
  contactId: string
): Promise<LeanEventContact | null> {
  if (isEntityBlobStorageEnabled()) {
    return contactBlob.get<LeanEventContact>(tenantId, contactId);
  }
  return readJsonFile<LeanEventContact>(getContactFilePath(tenantId, contactId));
}

export async function listStoredContacts(
  tenantId: string
): Promise<LeanEventContact[]> {
  return readManagedEntityList(tenantId, "contact", () =>
    listContactsFromBlobOrFs(tenantId)
  );
}

export async function getStoredContact(
  tenantId: string,
  contactId: string
): Promise<LeanEventContact | null> {
  return readManagedEntity(tenantId, "contact", contactId, () =>
    getContactFromBlobOrFs(tenantId, contactId)
  );
}

export async function saveStoredContact(contact: LeanEventContact): Promise<void> {
  if (isEntityBlobStorageEnabled()) {
    await contactBlob.save(contact);
    return;
  }
  await writeJsonFile(getContactFilePath(contact.tenantId, contact.id), contact);
}

export async function deleteStoredContact(
  tenantId: string,
  contactId: string
): Promise<void> {
  if (isEntityBlobStorageEnabled()) {
    await contactBlob.delete(tenantId, contactId);
    return;
  }
  await deleteJsonFile(getContactFilePath(tenantId, contactId));
}

export async function findContactByEmail(
  tenantId: string,
  email: string
): Promise<LeanEventContact | null> {
  const normalized = email.trim().toLowerCase();
  const contacts = await listStoredContacts(tenantId);
  return (
    contacts.find(
      (contact) => contact.email.trim().toLowerCase() === normalized
    ) ?? null
  );
}

export async function findContactByFiscalCode(
  tenantId: string,
  fiscalCode: string
): Promise<LeanEventContact | null> {
  const normalized = fiscalCode.trim().toUpperCase();
  if (!normalized) {
    return null;
  }
  const contacts = await listStoredContacts(tenantId);
  return (
    contacts.find(
      (contact) => (contact.fiscalCode ?? "").trim().toUpperCase() === normalized
    ) ?? null
  );
}
