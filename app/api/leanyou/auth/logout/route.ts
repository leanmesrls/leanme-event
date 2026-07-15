import { NextResponse } from "next/server";

import {
  auditContextFromSession,
  clientIpFromRequest,
  writeLeanEventAuditEvent,
} from "@/lib/lean-event/audit-log";
import { getSession, withoutSessionCookie } from "@/lib/lean-event/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (session) {
    await writeLeanEventAuditEvent({
      action: "logout",
      ip: clientIpFromRequest(request),
      ...auditContextFromSession(session),
    });
  }

  return withoutSessionCookie(NextResponse.json({ ok: true }));
}
