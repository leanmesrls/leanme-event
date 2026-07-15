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
import { createEvent, listEvents, saveEvent } from "@/lib/leanyou/events";
import { resolveEventVenueFields } from "@/lib/leanyou/event-venue";
import { normalizeMeetingDateInput } from "@/lib/leanyou/dates";
import type {
  LeonardoEcmModality,
  LeonardoEventCategoryId,
} from "@/types/leanyou";

export async function GET() {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "eventi")
    ) {
      return forbiddenResponse();
    }

    const events = await listEvents(session.tenantId);
    return NextResponse.json({ events });
  } catch (error) {
    return handleLeanYouRouteError(error, "Caricamento eventi non riuscito.");
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "eventi")
    ) {
      return forbiddenResponse();
    }

    const body = (await request.json()) as {
      cdc?: string;
      title?: string;
      venue?: string;
      venueId?: string | null;
      startDate?: string;
      endDate?: string;
      categoryId?: LeonardoEventCategoryId;
      healthAreaId?: string | null;
      ecmEnabled?: boolean | null;
      ecmModality?: LeonardoEcmModality | null;
      type?: "base" | "ecm";
      notes?: string;
    };

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Titolo obbligatorio." }, { status: 400 });
    }

    const venueFields = await resolveEventVenueFields(session.tenantId, {
      venueId: body.venueId ?? null,
      venue: body.venue ?? "",
    });

    const event = createEvent(session, {
      cdc: body.cdc ?? "",
      title: body.title,
      venue: venueFields.venue,
      venueId: venueFields.venueId,
      startDate: normalizeMeetingDateInput(body.startDate),
      endDate: normalizeMeetingDateInput(body.endDate || body.startDate),
      categoryId: body.categoryId,
      healthAreaId: body.healthAreaId ?? null,
      ecmEnabled: body.ecmEnabled ?? null,
      ecmModality: body.ecmModality ?? null,
      type: body.type,
      notes: body.notes ?? "",
    });

    await saveEvent(event);
    return NextResponse.json({ event });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_MEETING_DATE") {
      return NextResponse.json(
        { error: "Data non valida. Usa il formato gg/mm/aaaa." },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message.startsWith("INVALID_EVENT_TAXONOMY:")) {
      return NextResponse.json(
        { error: error.message.replace("INVALID_EVENT_TAXONOMY:", "") },
        { status: 400 }
      );
    }
    return handleLeanYouRouteError(error, "Creazione evento non riuscita.");
  }
}
