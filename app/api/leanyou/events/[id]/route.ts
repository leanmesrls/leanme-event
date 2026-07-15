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
import { sessionUserId } from "@/lib/leanyou/entity-lifecycle";
import { normalizeMeetingDateInput } from "@/lib/leanyou/dates";
import {
  isHealthFormationCategory,
  normalizeLeonardoEvent,
  validateEventTaxonomy,
} from "@/lib/leanyou/event-taxonomy";
import type { LeonardoEvent, LeonardoEventHotelBlock } from "@/types/leanyou";
import { deleteEvent, getEvent, saveEvent } from "@/lib/leanyou/events";
import { resolveEventVenueFields } from "@/lib/leanyou/event-venue";
import { normalizeHotelBlocks } from "@/lib/leanyou/event-hotel";

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

    const { id } = await context.params;
    const event = await getEvent(session.tenantId, id);
    if (!event) {
      return NextResponse.json({ error: "Evento non trovato." }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    return handleLeanYouRouteError(error, "Caricamento evento non riuscito.");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "eventi")
    ) {
      return forbiddenResponse();
    }

    const { id } = await context.params;
    const event = await getEvent(session.tenantId, id);
    if (!event) {
      return NextResponse.json({ error: "Evento non trovato." }, { status: 404 });
    }

    const body = (await request.json()) as Partial<LeonardoEvent> & {
      hotelBlocks?: LeonardoEventHotelBlock[];
      expectedRevision?: number;
    };
    const categoryId = body.categoryId ?? event.categoryId;
    const healthAreaId =
      body.healthAreaId !== undefined ? body.healthAreaId : event.healthAreaId;
    const ecmEnabled =
      body.ecmEnabled !== undefined ? body.ecmEnabled : event.ecmEnabled;
    const ecmModality =
      body.ecmModality !== undefined ? body.ecmModality : event.ecmModality;

    const taxonomyError = validateEventTaxonomy({
      categoryId,
      healthAreaId,
      ecmEnabled,
      ecmModality,
    });
    if (taxonomyError) {
      return NextResponse.json({ error: taxonomyError }, { status: 400 });
    }

    const venueFields = await resolveEventVenueFields(session.tenantId, {
      venueId: body.venueId !== undefined ? body.venueId : event.venueId ?? null,
      venue: body.venue !== undefined ? body.venue : event.venue,
    });

    const next = normalizeLeonardoEvent({
      ...event,
      cdc: body.cdc !== undefined ? body.cdc.trim() : event.cdc,
      title: body.title !== undefined ? body.title.trim() : event.title,
      venue: venueFields.venue,
      venueId: venueFields.venueId,
      startDate:
        body.startDate !== undefined
          ? normalizeMeetingDateInput(body.startDate)
          : event.startDate,
      endDate:
        body.endDate !== undefined
          ? normalizeMeetingDateInput(body.endDate)
          : event.endDate,
      categoryId,
      healthAreaId: isHealthFormationCategory(categoryId) ? healthAreaId : null,
      ecmEnabled: isHealthFormationCategory(categoryId) ? ecmEnabled : false,
      ecmModality:
        isHealthFormationCategory(categoryId) && ecmEnabled
          ? ecmModality
          : null,
      status: body.status ?? event.status,
      notes: body.notes !== undefined ? body.notes.trim() : event.notes,
      hotelBlocks:
        body.hotelBlocks !== undefined
          ? normalizeHotelBlocks({ hotelBlocks: body.hotelBlocks })
          : event.hotelBlocks,
      relatedEvents:
        body.relatedEvents !== undefined
          ? body.relatedEvents
          : event.relatedEvents,
    });

    const saved = await saveEvent(next, {
      expectedRevision: body.expectedRevision,
      userId: sessionUserId(session),
    });
    return NextResponse.json({ event: saved });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_MEETING_DATE") {
      return NextResponse.json(
        { error: "Data non valida. Usa il formato gg/mm/aaaa." },
        { status: 400 }
      );
    }
    return handleLeanYouRouteError(error, "Aggiornamento evento non riuscito.");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "eventi")
    ) {
      return forbiddenResponse();
    }

    const { id } = await context.params;
    await deleteEvent(session.tenantId, id, sessionUserId(session));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleLeanYouRouteError(error, "Eliminazione evento non riuscita.");
  }
}
