import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import {
  forbiddenResponse,
  handleLeanEventRouteError,
  requireSession,
} from "@/lib/lean-event/server-auth";
import { sessionUserId } from "@/lib/lean-event/entity-lifecycle";
import { saveVenueCoverFile } from "@/lib/lean-event/venue-cover-storage";
import { getVenue, saveVenue } from "@/lib/lean-event/venues";

interface RouteContext {
  params: Promise<{ id: string }>;
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

    const { id } = await context.params;
    const venue = await getVenue(session.tenantId, id);
    if (!venue) {
      return NextResponse.json({ error: "Sede non trovata." }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Seleziona un file immagine." },
        { status: 400 }
      );
    }

    let coverImageUrl: string;
    try {
      coverImageUrl = await saveVenueCoverFile(session.tenantId, id, file);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Upload non riuscito.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const saved = await saveVenue(
      {
        ...venue,
        coverImageUrl,
      },
      {
        expectedRevision: venue.revision ?? 1,
        userId: sessionUserId(session),
      }
    );

    return NextResponse.json({ venue: saved, coverImageUrl: saved.coverImageUrl });
  } catch (error) {
    return handleLeanEventRouteError(error, "Upload immagine non riuscito.");
  }
}
