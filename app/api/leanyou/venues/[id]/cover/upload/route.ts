import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/leanyou/auth";
import {
  forbiddenResponse,
  handleLeanYouRouteError,
  requireSession,
} from "@/lib/leanyou/server-auth";
import { saveVenueCoverFile } from "@/lib/leanyou/venue-cover-storage";
import { getVenue, saveVenue } from "@/lib/leanyou/venues";

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

    const next = {
      ...venue,
      coverImageUrl,
      updatedAt: new Date().toISOString(),
    };
    await saveVenue(next);

    return NextResponse.json({ venue: next, coverImageUrl });
  } catch (error) {
    return handleLeanYouRouteError(error, "Upload immagine non riuscito.");
  }
}
