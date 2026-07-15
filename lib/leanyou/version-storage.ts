import path from "node:path";

import { put } from "@vercel/blob";

import type { LeanYouManagedEntityType } from "@/lib/leanyou/entity-lifecycle";
import { isEntityBlobStorageEnabled } from "@/lib/leanyou/entity-blob-storage";
import { getDataRoot, writeJsonFile } from "@/lib/leanyou/storage";

const BLOB_ROOT = "leanyou/versions";
const BLOB_ACCESS = "private" as const;

function versionPathname(
  tenantId: string,
  entityType: LeanYouManagedEntityType,
  entityId: string,
  revision: number
): string {
  return `${BLOB_ROOT}/${tenantId}/${entityType}/${entityId}/r${revision}.json`;
}

function versionFilePath(
  tenantId: string,
  entityType: LeanYouManagedEntityType,
  entityId: string,
  revision: number
): string {
  return path.join(
    getDataRoot(),
    "versions",
    tenantId,
    entityType,
    entityId,
    `r${revision}.json`
  );
}

/** Snapshot immutabile prima di ogni overwrite (bridge fino a Postgres). */
export async function saveEntityVersionSnapshot(
  tenantId: string,
  entityType: LeanYouManagedEntityType,
  entityId: string,
  revision: number,
  snapshot: unknown
): Promise<void> {
  const payload = JSON.stringify(snapshot, null, 2);

  if (isEntityBlobStorageEnabled()) {
    await put(versionPathname(tenantId, entityType, entityId, revision), payload, {
      access: BLOB_ACCESS,
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: false,
    });
    return;
  }

  await writeJsonFile(
    versionFilePath(tenantId, entityType, entityId, revision),
    snapshot
  );
}
