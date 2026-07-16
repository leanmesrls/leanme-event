import { readdir } from "node:fs/promises";
import path from "node:path";

import { del, get, list, put } from "@vercel/blob";

import type { LeanEventManagedEntityType } from "@/lib/lean-event/entity-lifecycle";
import {
  LEAN_EVENT_VERSION_KEEP_DAYS,
  LEAN_EVENT_VERSION_KEEP_LAST,
} from "@/lib/lean-event/entity-lifecycle";
import { isEntityBlobStorageEnabled } from "@/lib/lean-event/entity-blob-storage";
import {
  getManagedEntityVersionFromNeon,
  insertManagedEntityVersionToNeon,
  listManagedEntityVersionsFromNeon,
} from "@/lib/lean-event/entity-db";
import {
  deleteJsonFile,
  getDataRoot,
  readJsonFile,
  writeJsonFile,
} from "@/lib/lean-event/storage";

const BLOB_ROOT = "lean-event/versions";
const BLOB_ACCESS = "private" as const;

export interface LeanEventEntityVersionMeta {
  revision: number;
  changedAt: string;
  changedBy: string;
  changeSummary?: string | null;
  source: "neon" | "blob" | "fs";
}

function versionPathname(
  tenantId: string,
  entityType: LeanEventManagedEntityType,
  entityId: string,
  revision: number
): string {
  return `${BLOB_ROOT}/${tenantId}/${entityType}/${entityId}/r${revision}.json`;
}

function versionDir(
  tenantId: string,
  entityType: LeanEventManagedEntityType,
  entityId: string
): string {
  return path.join(
    getDataRoot(),
    "versions",
    tenantId,
    entityType,
    entityId
  );
}

function versionFilePath(
  tenantId: string,
  entityType: LeanEventManagedEntityType,
  entityId: string,
  revision: number
): string {
  return path.join(versionDir(tenantId, entityType, entityId), `r${revision}.json`);
}

function parseRevisionFromName(name: string): number | null {
  const match = name.match(/(?:^|\/)r(\d+)\.json$/i);
  if (!match) {
    return null;
  }
  const revision = Number(match[1]);
  return Number.isFinite(revision) ? revision : null;
}

function metaFromSnapshot(
  revision: number,
  snapshot: unknown,
  source: LeanEventEntityVersionMeta["source"]
): LeanEventEntityVersionMeta {
  const record =
    snapshot && typeof snapshot === "object"
      ? (snapshot as Record<string, unknown>)
      : {};
  const changedAt =
    typeof record.updatedAt === "string"
      ? record.updatedAt
      : new Date(0).toISOString();
  const changedBy =
    typeof record.updatedBy === "string"
      ? record.updatedBy
      : typeof record.createdBy === "string"
        ? record.createdBy
        : "system";
  return { revision, changedAt, changedBy, changeSummary: null, source };
}

function versionRetentionCutoffIso(keepDays: number): string {
  return new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000).toISOString();
}

/** True se la revisione (rank 1 = più recente) va eliminata dalla retention. */
export function shouldPruneVersion(input: {
  rankFromNewest: number;
  changedAt: string;
  keepLast?: number;
  keepDays?: number;
}): boolean {
  const keepLast = input.keepLast ?? LEAN_EVENT_VERSION_KEEP_LAST;
  const keepDays = input.keepDays ?? LEAN_EVENT_VERSION_KEEP_DAYS;
  const cutoff = versionRetentionCutoffIso(keepDays);
  return input.rankFromNewest > keepLast && input.changedAt < cutoff;
}

async function pruneVersionsFromBlob(
  tenantId: string,
  entityType: LeanEventManagedEntityType,
  entityId: string
): Promise<number> {
  const metas = await listVersionsFromBlob(tenantId, entityType, entityId);
  const doomed = metas.filter((meta, index) =>
    shouldPruneVersion({
      rankFromNewest: index + 1,
      changedAt: meta.changedAt,
    })
  );
  if (doomed.length === 0) {
    return 0;
  }

  await Promise.all(
    doomed.map((meta) =>
      del(versionPathname(tenantId, entityType, entityId, meta.revision))
    )
  );
  return doomed.length;
}

async function pruneVersionsFromFs(
  tenantId: string,
  entityType: LeanEventManagedEntityType,
  entityId: string
): Promise<number> {
  const metas = await listVersionsFromFs(tenantId, entityType, entityId);
  const doomed = metas.filter((meta, index) =>
    shouldPruneVersion({
      rankFromNewest: index + 1,
      changedAt: meta.changedAt,
    })
  );
  if (doomed.length === 0) {
    return 0;
  }

  await Promise.all(
    doomed.map((meta) =>
      deleteJsonFile(
        versionFilePath(tenantId, entityType, entityId, meta.revision)
      )
    )
  );
  return doomed.length;
}

/**
 * Prune Blob + FS con la stessa policy Neon (ultimi N OR ultimi D giorni).
 * Non solleva: errori loggati.
 */
export async function pruneEntityVersionFiles(
  tenantId: string,
  entityType: LeanEventManagedEntityType,
  entityId: string
): Promise<{ blob: number; fs: number }> {
  let blob = 0;
  let fs = 0;

  if (isEntityBlobStorageEnabled()) {
    try {
      blob = await pruneVersionsFromBlob(tenantId, entityType, entityId);
    } catch (error) {
      console.error(
        JSON.stringify({
          lean_event_version_prune_blob_error: {
            entityType,
            entityId,
            message: error instanceof Error ? error.message : String(error),
          },
        })
      );
    }
  }

  try {
    fs = await pruneVersionsFromFs(tenantId, entityType, entityId);
  } catch (error) {
    console.error(
      JSON.stringify({
        lean_event_version_prune_fs_error: {
          entityType,
          entityId,
          message: error instanceof Error ? error.message : String(error),
        },
      })
    );
  }

  return { blob, fs };
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
  let blobOk = false;

  if (isEntityBlobStorageEnabled()) {
    try {
      await put(
        versionPathname(tenantId, entityType, entityId, revision),
        payload,
        {
          access: BLOB_ACCESS,
          contentType: "application/json",
          addRandomSuffix: false,
          allowOverwrite: false,
        }
      );
      blobOk = true;
    } catch (error) {
      // Revisione già presente su Blob (allowOverwrite: false) = ok; altri errori → FS
      const message = error instanceof Error ? error.message : String(error);
      if (/already exists|overwrite/i.test(message)) {
        blobOk = true;
      } else {
        console.error(
          JSON.stringify({
            lean_event_version_blob_fallback: {
              entityType,
              entityId,
              revision,
              message,
            },
          })
        );
      }
    }
  }

  if (!blobOk) {
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

  // Prune file store (Neon prune avviene già in insertManagedEntityVersionToNeon)
  await pruneEntityVersionFiles(tenantId, entityType, entityId);
}

async function listVersionsFromBlob(
  tenantId: string,
  entityType: LeanEventManagedEntityType,
  entityId: string
): Promise<LeanEventEntityVersionMeta[]> {
  const prefix = `${BLOB_ROOT}/${tenantId}/${entityType}/${entityId}/`;
  const metas: LeanEventEntityVersionMeta[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    for (const blob of page.blobs) {
      const revision = parseRevisionFromName(blob.pathname);
      if (revision === null) {
        continue;
      }
      const changedAt =
        blob.uploadedAt instanceof Date
          ? blob.uploadedAt.toISOString()
          : typeof blob.uploadedAt === "string"
            ? blob.uploadedAt
            : new Date(0).toISOString();
      metas.push({
        revision,
        changedAt,
        changedBy: "system",
        changeSummary: null,
        source: "blob",
      });
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return metas.sort((a, b) => b.revision - a.revision);
}

async function listVersionsFromFs(
  tenantId: string,
  entityType: LeanEventManagedEntityType,
  entityId: string
): Promise<LeanEventEntityVersionMeta[]> {
  const dir = versionDir(tenantId, entityType, entityId);
  let files: string[] = [];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }

  const metas: LeanEventEntityVersionMeta[] = [];
  for (const file of files) {
    const revision = parseRevisionFromName(file);
    if (revision === null) {
      continue;
    }
    const snapshot = await readJsonFile(
      versionFilePath(tenantId, entityType, entityId, revision)
    );
    if (!snapshot) {
      continue;
    }
    metas.push(metaFromSnapshot(revision, snapshot, "fs"));
  }

  return metas.sort((a, b) => b.revision - a.revision);
}

function mergeVersionMetas(
  primary: LeanEventEntityVersionMeta[],
  secondary: LeanEventEntityVersionMeta[]
): LeanEventEntityVersionMeta[] {
  const byRevision = new Map<number, LeanEventEntityVersionMeta>();
  for (const item of secondary) {
    byRevision.set(item.revision, item);
  }
  for (const item of primary) {
    byRevision.set(item.revision, item);
  }
  return [...byRevision.values()].sort((a, b) => b.revision - a.revision);
}

/** Elenco revisioni: Neon first, union con Blob/FS (Blob non deve far fallire l’API). */
export async function listEntityVersionMetas(
  tenantId: string,
  entityType: LeanEventManagedEntityType,
  entityId: string
): Promise<LeanEventEntityVersionMeta[]> {
  const neon = await listManagedEntityVersionsFromNeon(
    tenantId,
    entityType,
    entityId
  );
  const neonMetas: LeanEventEntityVersionMeta[] = neon.ok
    ? neon.data.map((row) => ({
        revision: row.revision,
        changedAt: row.changedAt,
        changedBy: row.changedBy,
        changeSummary: row.changeSummary,
        source: "neon" as const,
      }))
    : [];

  let blobMetas: LeanEventEntityVersionMeta[] = [];
  if (isEntityBlobStorageEnabled()) {
    try {
      blobMetas = await listVersionsFromBlob(tenantId, entityType, entityId);
    } catch (error) {
      console.error(
        JSON.stringify({
          lean_event_version_list_blob_error: {
            entityType,
            entityId,
            message: error instanceof Error ? error.message : String(error),
          },
        })
      );
    }
  }

  const fsMetas = await listVersionsFromFs(tenantId, entityType, entityId);

  return mergeVersionMetas(
    neonMetas,
    mergeVersionMetas(blobMetas, fsMetas)
  ).slice(0, LEAN_EVENT_VERSION_KEEP_LAST);
}

/** Snapshot di una revisione (Neon → Blob → FS). */
export async function getEntityVersionSnapshot<T = unknown>(
  tenantId: string,
  entityType: LeanEventManagedEntityType,
  entityId: string,
  revision: number
): Promise<T | null> {
  const neon = await getManagedEntityVersionFromNeon(
    tenantId,
    entityType,
    entityId,
    revision
  );
  if (neon.ok && neon.data?.snapshot !== undefined) {
    return neon.data.snapshot as T;
  }

  if (isEntityBlobStorageEnabled()) {
    try {
      const result = await get(
        versionPathname(tenantId, entityType, entityId, revision),
        { access: BLOB_ACCESS, useCache: false }
      );
      if (result?.stream) {
        const raw = await new Response(result.stream).text();
        return JSON.parse(raw) as T;
      }
    } catch {
      // fall through to FS
    }
  }

  return readJsonFile<T>(
    versionFilePath(tenantId, entityType, entityId, revision)
  );
}
