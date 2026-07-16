import path from "node:path";

import type { LeonardoEventSupplierLink } from "@/types/lean-event";

import { createEntityBlobStore, isEntityBlobStorageEnabled } from "./entity-blob-storage";
import { readManagedEntity, readManagedEntityList } from "./entity-read";
import {
  deleteJsonFile,
  getDataRoot,
  listJsonFiles,
  readJsonFile,
  writeJsonFile,
} from "./storage";

const BLOB_ROOT = "lean-event/event-suppliers";
const linkBlob = createEntityBlobStore(BLOB_ROOT);

export function getEventSupplierDir(tenantId: string): string {
  return path.join(getDataRoot(), "event-suppliers", tenantId);
}

export function getEventSupplierFilePath(
  tenantId: string,
  linkId: string
): string {
  return path.join(getEventSupplierDir(tenantId), `${linkId}.json`);
}

async function listLinksFromBlobOrFs(
  tenantId: string
): Promise<LeonardoEventSupplierLink[]> {
  if (isEntityBlobStorageEnabled()) {
    return linkBlob.listAll<LeonardoEventSupplierLink>(tenantId);
  }

  const dir = getEventSupplierDir(tenantId);
  const files = await listJsonFiles(dir);
  const links = await Promise.all(
    files.map((file) =>
      readJsonFile<LeonardoEventSupplierLink>(`${dir}/${file}`)
    )
  );
  return links.filter((link): link is LeonardoEventSupplierLink => Boolean(link));
}

async function getLinkFromBlobOrFs(
  tenantId: string,
  linkId: string
): Promise<LeonardoEventSupplierLink | null> {
  if (isEntityBlobStorageEnabled()) {
    return linkBlob.get<LeonardoEventSupplierLink>(tenantId, linkId);
  }
  return readJsonFile<LeonardoEventSupplierLink>(
    getEventSupplierFilePath(tenantId, linkId)
  );
}

export async function listStoredEventSupplierLinks(
  tenantId: string
): Promise<LeonardoEventSupplierLink[]> {
  return readManagedEntityList(tenantId, "event_supplier_link", () =>
    listLinksFromBlobOrFs(tenantId)
  );
}

export async function getStoredEventSupplierLink(
  tenantId: string,
  linkId: string
): Promise<LeonardoEventSupplierLink | null> {
  return readManagedEntity(tenantId, "event_supplier_link", linkId, () =>
    getLinkFromBlobOrFs(tenantId, linkId)
  );
}

export async function saveStoredEventSupplierLink(
  link: LeonardoEventSupplierLink
): Promise<void> {
  if (isEntityBlobStorageEnabled()) {
    await linkBlob.save(link);
    return;
  }
  await writeJsonFile(
    getEventSupplierFilePath(link.tenantId, link.id),
    link
  );
}

export async function deleteStoredEventSupplierLink(
  tenantId: string,
  linkId: string
): Promise<void> {
  if (isEntityBlobStorageEnabled()) {
    await linkBlob.delete(tenantId, linkId);
    return;
  }
  await deleteJsonFile(getEventSupplierFilePath(tenantId, linkId));
}
