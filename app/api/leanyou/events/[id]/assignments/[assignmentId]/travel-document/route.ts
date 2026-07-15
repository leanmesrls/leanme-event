import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import { getAssignment } from "@/lib/lean-event/event-assignments";
import { getEvent } from "@/lib/lean-event/events";
import {
  forbiddenResponse,
  handleLeanEventRouteError,
  requireSession,
} from "@/lib/lean-event/server-auth";
import {
  readTravelDocumentFile,
  saveTravelDocumentFile,
} from "@/lib/lean-event/travel-document-storage";

interface RouteContext {
  params: Promise<{ id: string; assignmentId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "hotel")
    ) {
      return forbiddenResponse();
    }

    const { id: eventId, assignmentId } = await context.params;
    const url = new URL(request.url);
    const segmentId = url.searchParams.get("segmentId") ?? "";
    const side = url.searchParams.get("side") ?? "document";

    const assignment = await getAssignment(session.tenantId, assignmentId);
    if (!assignment || assignment.eventId !== eventId) {
      return NextResponse.json({ error: "Assegnazione non trovata." }, { status: 404 });
    }

    const file = await readTravelDocumentFile({
      tenantId: session.tenantId,
      eventId,
      assignmentId,
      segmentId,
      side,
    });
    if (!file) {
      return NextResponse.json({ error: "Documento non trovato." }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(file.buffer), {
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return handleLeanEventRouteError(error, "Caricamento documento non riuscito.");
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "hotel")
    ) {
      return forbiddenResponse();
    }

    const { id: eventId, assignmentId } = await context.params;
    const event = await getEvent(session.tenantId, eventId);
    if (!event) {
      return NextResponse.json({ error: "Evento non trovato." }, { status: 404 });
    }

    const assignment = await getAssignment(session.tenantId, assignmentId);
    if (!assignment || assignment.eventId !== eventId) {
      return NextResponse.json(
        { error: "Assegnazione non trovata." },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const segmentId = String(formData.get("segmentId") ?? "");
    const side = String(formData.get("side") ?? "document") as
      | "document"
      | "front"
      | "back";

    if (!(file instanceof File) || !segmentId) {
      return NextResponse.json(
        { error: "File o segmento viaggio mancante." },
        { status: 400 }
      );
    }

    let url: string;
    try {
      url = await saveTravelDocumentFile({
        tenantId: session.tenantId,
        eventId,
        assignmentId,
        segmentId,
        side,
        file,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Upload non riuscito.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ url, segmentId, side });
  } catch (error) {
    return handleLeanEventRouteError(error, "Upload documento non riuscito.");
  }
}
