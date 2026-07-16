import { NextResponse } from "next/server";

import { createDailyBlobBackupManifest } from "@/lib/lean-event/backup-blob";
import { readLeanEventEnv } from "@/lib/lean-event/env";

export const runtime = "nodejs";
export const maxDuration = 300;

function readCronSecret(): string | undefined {
  return (
    readLeanEventEnv("LEAN_EVENT_CRON_SECRET") ??
    process.env.CRON_SECRET?.trim()
  );
}

function isAuthorized(request: Request): boolean {
  const secret = readCronSecret();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) {
    return true;
  }

  return request.headers.get("x-cron-secret") === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  try {
    const result = await createDailyBlobBackupManifest();
    console.info(JSON.stringify({ lean_event_blob_backup: result }));
    return NextResponse.json(result);
  } catch (error) {
    console.error(
      JSON.stringify({
        lean_event_blob_backup_failed: {
          message: error instanceof Error ? error.message : String(error),
        },
      })
    );
    return NextResponse.json(
      { error: "Backup Blob non riuscito." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
