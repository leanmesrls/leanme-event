import { NextResponse } from "next/server";

import {
  auditContextFromSession,
  clientIpFromRequest,
  writeLeanYouAuditEvent,
} from "@/lib/leanyou/audit-log";
import { getSession, withoutSessionCookie } from "@/lib/leanyou/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (session) {
    await writeLeanYouAuditEvent({
      action: "logout",
      ip: clientIpFromRequest(request),
      ...auditContextFromSession(session),
    });
  }

  return withoutSessionCookie(NextResponse.json({ ok: true }));
}
