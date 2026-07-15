import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import { getEvent } from "@/lib/lean-event/events";
import {
  appendEventSupplierEmail,
  getEventSupplierLink,
  saveEventSupplierLink,
} from "@/lib/lean-event/event-suppliers";
import {
  forbiddenResponse,
  handleLeanEventRouteError,
  requireSession,
} from "@/lib/lean-event/server-auth";

interface RouteContext {
  params: Promise<{ id: string; linkId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "eventi")
    ) {
      return forbiddenResponse();
    }

    const { id: eventId, linkId } = await context.params;
    const event = await getEvent(session.tenantId, eventId);
    if (!event) {
      return NextResponse.json({ error: "Evento non trovato." }, { status: 404 });
    }

    const link = await getEventSupplierLink(session.tenantId, linkId);
    if (!link || link.eventId !== eventId) {
      return NextResponse.json({ error: "Fornitore evento non trovato." }, { status: 404 });
    }

    const body = (await request.json()) as {
      subject?: string;
      occurredAt?: string;
      direction?: "inbound" | "outbound";
      fromEmail?: string;
      toEmail?: string;
      summary?: string;
    };

    if (!body.subject?.trim()) {
      return NextResponse.json(
        { error: "Oggetto email obbligatorio." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const emailRecord = {
      id: randomUUID(),
      subject: body.subject.trim(),
      occurredAt: body.occurredAt?.trim() || now,
      direction: body.direction === "inbound" ? ("inbound" as const) : ("outbound" as const),
      fromEmail: body.fromEmail?.trim() ?? "",
      toEmail: body.toEmail?.trim() ?? "",
      summary: body.summary?.trim() ?? "",
      attachmentDocumentIds: [],
      createdAt: now,
    };

    const updated = appendEventSupplierEmail(link, emailRecord);
    await saveEventSupplierLink(updated);
    return NextResponse.json({ link: updated, email: emailRecord });
  } catch (error) {
    return handleLeanEventRouteError(error, "Registrazione email non riuscita.");
  }
}
