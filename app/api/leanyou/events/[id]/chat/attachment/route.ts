import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { tenantHasLeonardoCapability, tenantHasModule } from "@/lib/lean-event/auth";
import { getEvent } from "@/lib/lean-event/events";
import {
  forbiddenResponse,
  handleLeanEventRouteError,
  requireSession,
} from "@/lib/lean-event/server-auth";
import { saveChatAttachmentFile } from "@/lib/lean-event/chat-attachment-storage";
import { getDataRoot } from "@/lib/lean-event/storage";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "eventi")
    ) {
      return forbiddenResponse();
    }

    const { id: eventId } = await context.params;
    const url = new URL(request.url);
    const attachmentId = url.searchParams.get("id") ?? "";
    const name = url.searchParams.get("name") ?? "file";

    if (!attachmentId) {
      return NextResponse.json({ error: "Allegato non trovato." }, { status: 404 });
    }

    const dir = path.join(getDataRoot(), "event-chat", session.tenantId, eventId);
    const filename = `${attachmentId}-${name}`;
    const buffer = await readFile(path.join(dir, filename));

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `inline; filename="${name}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Allegato non trovato." }, { status: 404 });
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

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File mancante." }, { status: 400 });
    }

    const attachmentId = randomUUID();
    const url = await saveChatAttachmentFile({
      tenantId: session.tenantId,
      eventId,
      attachmentId,
      file,
    });

    return NextResponse.json({
      attachment: {
        id: attachmentId,
        name: file.name,
        url,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Formato")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleLeanEventRouteError(error, "Upload allegato non riuscito.");
  }
}
