import { NextResponse } from "next/server";

import { exportAllTenants } from "@/lib/lean-event/tenant-export";
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
    const results = await exportAllTenants();
    const ok = results.filter((r) => r.ok).length;
    console.info(
      JSON.stringify({
        lean_event_tenant_export: { tenants: results.length, ok, results },
      })
    );
    return NextResponse.json({ ok: true, tenants: results.length, results });
  } catch (error) {
    console.error(
      JSON.stringify({
        lean_event_tenant_export_failed: {
          message: error instanceof Error ? error.message : String(error),
        },
      })
    );
    return NextResponse.json(
      { error: "Export tenant non riuscito." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
