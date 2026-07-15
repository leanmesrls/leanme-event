import { NextResponse } from "next/server";

import { tenantHasLeonardoCapability, tenantHasModule } from "@/lib/leanyou/auth";
import {
  appendEventChatMessage,
  extractMentions,
  listEventChatMessages,
} from "@/lib/leanyou/event-chat";
import { getEvent } from "@/lib/leanyou/events";
import {
  forbiddenResponse,
  handleLeanYouRouteError,
  requireSession,
} from "@/lib/leanyou/server-auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "eventi")
    ) {
      return forbiddenResponse();
    }

    const { id: eventId } = await context.params;
    const event = await getEvent(session.tenantId, eventId);
    if (!event) {
      return NextResponse.json({ error: "Evento non trovato." }, { status: 404 });
    }

    const messages = await listEventChatMessages(session.tenantId, eventId);
    return NextResponse.json({ messages });
  } catch (error) {
    return handleLeanYouRouteError(error, "Lettura chat non riuscita.");
  }
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

    const { id: eventId } = await context.params;
    const event = await getEvent(session.tenantId, eventId);
    if (!event) {
      return NextResponse.json({ error: "Evento non trovato." }, { status: 404 });
    }

    const body = (await request.json()) as {
      body?: string;
      links?: Array<{ label: string; href: string }>;
      attachments?: Array<{
        id: string;
        name: string;
        url: string;
        mimeType: string;
        sizeBytes: number;
      }>;
    };

    const text = body.body?.trim() ?? "";
    const message = await appendEventChatMessage(session, eventId, {
      body: text,
      links: body.links,
      mentions: extractMentions(text),
      attachments: body.attachments,
    });

    return NextResponse.json({ message });
  } catch (error) {
    if (error instanceof Error && error.message === "EMPTY_MESSAGE") {
      return NextResponse.json(
        { error: "Scrivi un messaggio o allega un file." },
        { status: 400 }
      );
    }
    return handleLeanYouRouteError(error, "Invio messaggio non riuscito.");
  }
}
