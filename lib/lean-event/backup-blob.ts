/**
 * Backup giornaliero Blob Lean Event (Fase C).
 * Scrive un manifest JSON con tutti i path sotto i prefissi critici.
 * Non duplica i binari (costo); consente recovery inventory + verifica integrità.
 * Retention manifest: LEAN_EVENT_BACKUP_KEEP_DAYS (default 90).
 */

import { list, put, del } from "@vercel/blob";

const BACKUP_ROOT = "lean-event/backups";
const DEFAULT_KEEP_DAYS = 90;

const CRITICAL_PREFIXES = [
  "lean-event/workspaces/",
  "lean-event/versions/",
  "lean-event/events/",
  "lean-event/contacts/",
  "lean-event/venues/",
  "lean-event/suppliers/",
  "lean-event/event-assignments/",
  "lean-event/event-suppliers/",
  "lean-event/event-chats/",
  "lean-event/event-chat/",
  "lean-event/travel-docs/",
  "lean-event/venue-covers/",
  "lean-event/supplier-documents/",
  "lean-event/documents/",
] as const;

export interface LeanEventBlobBackupEntry {
  pathname: string;
  size?: number;
  uploadedAt?: string;
}

export interface LeanEventBlobBackupManifest {
  createdAt: string;
  prefixes: string[];
  entryCount: number;
  entries: LeanEventBlobBackupEntry[];
}

function isBlobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function keepDays(): number {
  const raw = process.env.LEAN_EVENT_BACKUP_KEEP_DAYS?.trim();
  const n = raw ? Number(raw) : DEFAULT_KEEP_DAYS;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_KEEP_DAYS;
}

function todayStamp(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

async function listPrefix(prefix: string): Promise<LeanEventBlobBackupEntry[]> {
  const entries: LeanEventBlobBackupEntry[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    for (const blob of page.blobs) {
      entries.push({
        pathname: blob.pathname,
        size: blob.size,
        uploadedAt:
          blob.uploadedAt instanceof Date
            ? blob.uploadedAt.toISOString()
            : typeof blob.uploadedAt === "string"
              ? blob.uploadedAt
              : undefined,
      });
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return entries;
}

export async function createDailyBlobBackupManifest(): Promise<{
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  manifestPath?: string;
  entryCount?: number;
  pruned?: number;
}> {
  if (!isBlobEnabled()) {
    return {
      ok: true,
      skipped: true,
      reason: "BLOB_READ_WRITE_TOKEN assente",
    };
  }

  const createdAt = new Date().toISOString();
  const stamp = todayStamp();
  const entries: LeanEventBlobBackupEntry[] = [];

  for (const prefix of CRITICAL_PREFIXES) {
    const page = await listPrefix(prefix);
    entries.push(...page);
  }

  // Dedup pathname
  const byPath = new Map<string, LeanEventBlobBackupEntry>();
  for (const entry of entries) {
    byPath.set(entry.pathname, entry);
  }
  const unique = [...byPath.values()].sort((a, b) =>
    a.pathname.localeCompare(b.pathname)
  );

  const manifest: LeanEventBlobBackupManifest = {
    createdAt,
    prefixes: [...CRITICAL_PREFIXES],
    entryCount: unique.length,
    entries: unique,
  };

  const manifestPath = `${BACKUP_ROOT}/${stamp}/manifest.json`;
  await put(manifestPath, JSON.stringify(manifest, null, 2), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  const pruned = await pruneOldBackupManifests();

  return {
    ok: true,
    manifestPath,
    entryCount: unique.length,
    pruned,
  };
}

async function pruneOldBackupManifests(): Promise<number> {
  const cutoff = Date.now() - keepDays() * 24 * 60 * 60 * 1000;
  const prefix = `${BACKUP_ROOT}/`;
  let cursor: string | undefined;
  let pruned = 0;

  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    for (const blob of page.blobs) {
      // lean-event/backups/YYYY-MM-DD/manifest.json
      const match = blob.pathname.match(
        /lean-event\/backups\/(\d{4}-\d{2}-\d{2})\//
      );
      if (!match) {
        continue;
      }
      const day = match[1];
      const dayMs = Date.parse(`${day}T00:00:00.000Z`);
      if (!Number.isFinite(dayMs) || dayMs >= cutoff) {
        continue;
      }
      await del(blob.pathname);
      pruned += 1;
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return pruned;
}
