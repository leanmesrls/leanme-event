import path from "node:path";

import type { LeanYouSupplier } from "@/types/leanyou";

import { createEntityBlobStore, isEntityBlobStorageEnabled } from "./entity-blob-storage";
import {
  deleteJsonFile,
  getDataRoot,
  listJsonFiles,
  readJsonFile,
  writeJsonFile,
} from "./storage";

const BLOB_ROOT = "leanyou/suppliers";
const supplierBlob = createEntityBlobStore(BLOB_ROOT);

export function getSupplierDir(tenantId: string): string {
  return path.join(getDataRoot(), "suppliers", tenantId);
}

export function getSupplierFilePath(
  tenantId: string,
  supplierId: string
): string {
  return path.join(getSupplierDir(tenantId), `${supplierId}.json`);
}

export async function listStoredSuppliers(
  tenantId: string
): Promise<LeanYouSupplier[]> {
  if (isEntityBlobStorageEnabled()) {
    return supplierBlob.listAll<LeanYouSupplier>(tenantId);
  }

  const dir = getSupplierDir(tenantId);
  const files = await listJsonFiles(dir);
  const suppliers = await Promise.all(
    files.map((file) => readJsonFile<LeanYouSupplier>(`${dir}/${file}`))
  );
  return suppliers.filter(
    (supplier): supplier is LeanYouSupplier => Boolean(supplier)
  );
}

export async function getStoredSupplier(
  tenantId: string,
  supplierId: string
): Promise<LeanYouSupplier | null> {
  if (isEntityBlobStorageEnabled()) {
    return supplierBlob.get<LeanYouSupplier>(tenantId, supplierId);
  }
  return readJsonFile<LeanYouSupplier>(
    getSupplierFilePath(tenantId, supplierId)
  );
}

export async function saveStoredSupplier(
  supplier: LeanYouSupplier
): Promise<void> {
  if (isEntityBlobStorageEnabled()) {
    await supplierBlob.save(supplier);
    return;
  }
  await writeJsonFile(
    getSupplierFilePath(supplier.tenantId, supplier.id),
    supplier
  );
}

export async function deleteStoredSupplier(
  tenantId: string,
  supplierId: string
): Promise<void> {
  if (isEntityBlobStorageEnabled()) {
    await supplierBlob.delete(tenantId, supplierId);
    return;
  }
  await deleteJsonFile(getSupplierFilePath(tenantId, supplierId));
}
