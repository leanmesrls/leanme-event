/**
 * Entity version snapshots — Neon primary + local FS mirror.
 * Blob dual-write removed (Neon-only runtime).
 */

import { readdir } from "node:fs/promises";
import path from "node:path";

import type { LeanEventManagedEntityType } from "@/lib/lean-event/entity-lifecycle";
import {
  LEAN_EVENT_VERSION_KEEP_DAYS,
  LEAN_EVENT_VERSION_KEEP_LAST,
} from "@/lib/lean-event/entity-lifecycle";
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

export interface LeanEventEntityVersionMeta {
  revision: number;
  changedAt: string;
  changedBy: string;
  changeSummary?: string | null;
  source: "neon" | "fs";
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

export async function pruneEntityVersionFiles(
  tenantId: string,
  entityType: LeanEventManagedEntityType,
  entityId: string
): Promise<{ blob: number; fs: number }> {
  let fs = 0;
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
  return { blob: 0, fs };
}

/** Snapshot immutabile prima di ogni overwrite (FS + Neon). */
export async function saveEntityVersionSnapshot(
  tenantId: string,
  entityType: LeanEventManagedEntityType,
  entityId: string,
  revision: number,
  snapshot: unknown
): Promise<void> {
  await writeJsonFile(
    versionFilePath(tenantId, entityType, entityId, revision),
    snapshot
  );

  await insertManagedEntityVersionToNeon(
    tenantId,
    entityType,
    entityId,
    revision,
    snapshot
  );

  await pruneEntityVersionFiles(tenantId, entityType, entityId);
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

/** Elenco revisioni: Neon first, union con FS. */
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

  const fsMetas = await listVersionsFromFs(tenantId, entityType, entityId);
  return mergeVersionMetas(neonMetas, fsMetas).slice(
    0,
    LEAN_EVENT_VERSION_KEEP_LAST
  );
}

/** Snapshot di una revisione (Neon → FS). */
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

  return readJsonFile<T>(
    versionFilePath(tenantId, entityType, entityId, revision)
  );
}
