/**
 * Legacy daily Blob backup — disabled (Neon-only runtime).
 * Cron route keeps calling this; it skip-succeeds without touching Blob.
 * Inventory/migrate scripts under scripts/ remain for final decommission.
 */

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

export async function createDailyBlobBackupManifest(): Promise<{
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  manifestPath?: string;
  entryCount?: number;
  pruned?: number;
}> {
  return {
    ok: true,
    skipped: true,
    reason: "BLOB_RUNTIME_DISABLED_NEON_ONLY",
  };
}
