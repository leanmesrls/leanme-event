import path from "node:path";

import { put } from "@vercel/blob";

import type { LeanEventManagedEntityType } from "@/lib/lean-event/entity-lifecycle";
import { isEntityBlobStorageEnabled } from "@/lib/lean-event/entity-blob-storage";
import { insertManagedEntityVersionToNeon } from "@/lib/lean-event/entity-db";
import { getDataRoot, writeJsonFile } from "@/lib/lean-event/storage";

const BLOB_ROOT = "lean-event/versions";
const BLOB_ACCESS = "private" as const;

function versionPathname(
  tenantId: string,
  entityType: LeanEventManagedEntityType,
  entityId: string,
  revision: number
): string {
  return `${BLOB_ROOT}/${tenantId}/${entityType}/${entityId}/r${revision}.json`;
}

function versionFilePath(
  tenantId: string,
  entityType: LeanEventManagedEntityType,
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

/** Snapshot immutabile prima di ogni overwrite (Blob/FS + Neon). */
export async function saveEntityVersionSnapshot(
  tenantId: string,
  entityType: LeanEventManagedEntityType,
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
  } else {
    await writeJsonFile(
      versionFilePath(tenantId, entityType, entityId, revision),
      snapshot
    );
  }

  await insertManagedEntityVersionToNeon(
    tenantId,
    entityType,
    entityId,
    revision,
    snapshot
  );
}
