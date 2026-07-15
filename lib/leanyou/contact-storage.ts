import path from "node:path";

import type { LeanYouContact } from "@/types/leanyou";

import { createEntityBlobStore, isEntityBlobStorageEnabled } from "./entity-blob-storage";
import {
  deleteJsonFile,
  getDataRoot,
  listJsonFiles,
  readJsonFile,
  writeJsonFile,
} from "./storage";

const BLOB_ROOT = "leanyou/contacts";
const contactBlob = createEntityBlobStore(BLOB_ROOT);

export function getContactDir(tenantId: string): string {
  return path.join(getDataRoot(), "contacts", tenantId);
}

export function getContactFilePath(tenantId: string, contactId: string): string {
  return path.join(getContactDir(tenantId), `${contactId}.json`);
}

export async function listStoredContacts(
  tenantId: string
): Promise<LeanYouContact[]> {
  if (isEntityBlobStorageEnabled()) {
    return contactBlob.listAll<LeanYouContact>(tenantId);
  }

  const dir = getContactDir(tenantId);
  const files = await listJsonFiles(dir);
  const contacts = await Promise.all(
    files.map((file) => readJsonFile<LeanYouContact>(`${dir}/${file}`))
  );
  return contacts.filter((contact): contact is LeanYouContact => Boolean(contact));
}

export async function getStoredContact(
  tenantId: string,
  contactId: string
): Promise<LeanYouContact | null> {
  if (isEntityBlobStorageEnabled()) {
    return contactBlob.get<LeanYouContact>(tenantId, contactId);
  }
  return readJsonFile<LeanYouContact>(getContactFilePath(tenantId, contactId));
}

export async function saveStoredContact(contact: LeanYouContact): Promise<void> {
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
): Promise<LeanYouContact | null> {
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
): Promise<LeanYouContact | null> {
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
