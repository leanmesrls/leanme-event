import { NextResponse } from "next/server";

import { purgeExpiredTrashForAllTenants } from "@/lib/lean-event/purge-trash";
import { readLeanEventEnv } from "@/lib/lean-event/env";

export const runtime = "nodejs";

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
    const results = await purgeExpiredTrashForAllTenants();
    const totals = results.reduce(
      (acc, item) => ({
        events: acc.events + item.purged.events,
        contacts: acc.contacts + item.purged.contacts,
        suppliers: acc.suppliers + item.purged.suppliers,
        venues: acc.venues + item.purged.venues,
        assignments: acc.assignments + item.purged.assignments,
        workspaces: acc.workspaces + item.purged.workspaces,
      }),
      { events: 0, contacts: 0, suppliers: 0, venues: 0, assignments: 0, workspaces: 0 }
    );

    console.info(
      JSON.stringify({
        lean_event_purge_trash: { tenants: results.length, totals, results },
      })
    );

    return NextResponse.json({ ok: true, tenants: results.length, totals, results });
  } catch (error) {
    console.error(
      JSON.stringify({
        lean_event_purge_trash_failed: {
          message: error instanceof Error ? error.message : String(error),
        },
      })
    );
    return NextResponse.json(
      { error: "Purge cestino non riuscito." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
