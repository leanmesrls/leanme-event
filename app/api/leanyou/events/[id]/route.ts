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
import { normalizeMeetingDateInput } from "@/lib/lean-event/dates";
import {
  isFormationCategory,
  isHealthFormationCategory,
  normalizeLeonardoEvent,
  validateEventTaxonomy,
} from "@/lib/lean-event/event-taxonomy";
import type { LeonardoEvent, LeonardoEventHotelBlock } from "@/types/lean-event";
import { deleteEvent, getEvent, saveEvent } from "@/lib/lean-event/events";
import { reconcileEventAssignmentsWithHotelBlocks } from "@/lib/lean-event/event-assignments";
import { resolveEventVenueFields } from "@/lib/lean-event/event-venue";
import { validateEventRequiredFields } from "@/lib/lean-event/event-required";
import { normalizeEcmGrid } from "@/lib/lean-event/ecm-grid";
import { normalizeEventRegistration } from "@/lib/lean-event/event-registration";
import { normalizeHotelBlocks } from "@/lib/lean-event/event-hotel";
import { normalizeScientificProgram } from "@/lib/lean-event/scientific-program";
import {
  listPublicTenantUsersByTenantId,
  sanitizeEventProjectTeam,
} from "@/lib/lean-event/tenant-users";

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
    return handleLeanEventRouteError(error, "Caricamento evento non riuscito.");
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
    const formationEventTypeId =
      body.formationEventTypeId !== undefined
        ? body.formationEventTypeId
        : event.formationEventTypeId ?? null;
    const formationStructureName =
      body.formationStructureName !== undefined
        ? body.formationStructureName
        : event.formationStructureName ?? null;

    const taxonomyError = validateEventTaxonomy({
      categoryId,
      healthAreaId,
      ecmEnabled,
      ecmModality,
      formationEventTypeId,
      formationStructureName,
    });
    if (taxonomyError) {
      return NextResponse.json({ error: taxonomyError }, { status: 400 });
    }

    const venueFields = await resolveEventVenueFields(session.tenantId, {
      venueId: body.venueId !== undefined ? body.venueId : event.venueId ?? null,
      venue: body.venue !== undefined ? body.venue : event.venue,
      venueDetails:
        body.venueDetails !== undefined
          ? body.venueDetails
          : event.venueDetails,
    });

    const tenantUsers = await listPublicTenantUsersByTenantId(session.tenantId);
    const projectTeam =
      body.projectLeaderUserId !== undefined ||
      body.projectManagerUserIds !== undefined
        ? sanitizeEventProjectTeam(tenantUsers, {
            projectLeaderUserId:
              body.projectLeaderUserId !== undefined
                ? body.projectLeaderUserId
                : event.projectLeaderUserId ?? null,
            projectManagerUserIds:
              body.projectManagerUserIds !== undefined
                ? body.projectManagerUserIds
                : event.projectManagerUserIds ?? [],
          })
        : {
            projectLeaderUserId: event.projectLeaderUserId ?? null,
            projectManagerUserIds: event.projectManagerUserIds ?? [],
          };

    const next = normalizeLeonardoEvent({
      ...event,
      cdc: body.cdc !== undefined ? body.cdc.trim() : event.cdc,
      title: body.title !== undefined ? body.title.trim() : event.title,
      venue: venueFields.venue,
      venueId: venueFields.venueId,
      venueDetails: venueFields.venueDetails,
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
      ecmModality: isFormationCategory(categoryId) ? ecmModality : null,
      formationEventTypeId: isFormationCategory(categoryId)
        ? formationEventTypeId
        : null,
      formationStructureName: isFormationCategory(categoryId)
        ? formationStructureName
        : null,
      ecmGrid: isFormationCategory(categoryId)
        ? body.ecmGrid !== undefined
          ? normalizeEcmGrid(body.ecmGrid)
          : normalizeEcmGrid(event.ecmGrid)
        : null,
      registration:
        body.registration !== undefined
          ? normalizeEventRegistration(body.registration)
          : normalizeEventRegistration(event.registration),
      scientificProgram:
        body.scientificProgram !== undefined
          ? normalizeScientificProgram(body.scientificProgram)
          : normalizeScientificProgram(event.scientificProgram),
      eventSponsors:
        body.eventSponsors !== undefined
          ? body.eventSponsors
          : event.eventSponsors ?? [],
      status: body.status ?? event.status,
      notes: body.notes !== undefined ? body.notes.trim() : event.notes,
      isFavorite:
        body.isFavorite !== undefined
          ? Boolean(body.isFavorite)
          : Boolean(event.isFavorite),
      hotelBlocks:
        body.hotelBlocks !== undefined
          ? normalizeHotelBlocks({ hotelBlocks: body.hotelBlocks })
          : event.hotelBlocks,
      relatedEvents:
        body.relatedEvents !== undefined
          ? body.relatedEvents
          : event.relatedEvents,
      projectLeaderUserId: projectTeam.projectLeaderUserId,
      projectManagerUserIds: projectTeam.projectManagerUserIds,
    });

    const requiredError = validateEventRequiredFields(next);
    if (requiredError) {
      return NextResponse.json({ error: requiredError }, { status: 400 });
    }

    const saved = await saveEvent(next, {
      expectedRevision: body.expectedRevision,
      userId: sessionUserId(session),
    });

    let reconciledAssignments = 0;
    if (body.hotelBlocks !== undefined) {
      reconciledAssignments = await reconcileEventAssignmentsWithHotelBlocks(
        session.tenantId,
        id,
        normalizeHotelBlocks(saved),
        sessionUserId(session)
      );
    }

    return NextResponse.json({ event: saved, reconciledAssignments });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_MEETING_DATE") {
      return NextResponse.json(
        { error: "Data non valida. Usa il formato gg/mm/aaaa." },
        { status: 400 }
      );
    }
    return handleLeanEventRouteError(error, "Aggiornamento evento non riuscito.");
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
    return handleLeanEventRouteError(error, "Eliminazione evento non riuscita.");
  }
}
