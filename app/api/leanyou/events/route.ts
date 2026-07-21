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
import { createEvent, listEvents, saveEvent } from "@/lib/lean-event/events";
import { resolveEventVenueFields } from "@/lib/lean-event/event-venue";
import { validateEventRequiredFields } from "@/lib/lean-event/event-required";
import { normalizeMeetingDateInput } from "@/lib/lean-event/dates";
import { listPublicTenantUsersByTenantId } from "@/lib/lean-event/tenant-users";
import { sanitizeEventProjectTeam } from "@/lib/lean-event/tenant-users-display";
import type {
  LeonardoEcmModality,
  LeonardoEventCategoryId,
  LeonardoFormationEventTypeId,
} from "@/types/lean-event";

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
    return handleLeanEventRouteError(error, "Caricamento eventi non riuscito.");
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
      venueDetails?: {
        name?: string;
        address?: string;
        city?: string;
        province?: string;
        region?: string;
        postalCode?: string;
        country?: string;
        notes?: string;
      } | null;
      startDate?: string;
      endDate?: string;
      categoryId?: LeonardoEventCategoryId;
      healthAreaId?: string | null;
      ecmEnabled?: boolean | null;
      ecmModality?: LeonardoEcmModality | null;
      formationEventTypeId?: LeonardoFormationEventTypeId | null;
      formationStructureName?: string | null;
      type?: "base" | "ecm";
      notes?: string;
      projectLeaderUserId?: string | null;
      projectManagerUserIds?: string[];
    };

    const venueFields = await resolveEventVenueFields(session.tenantId, {
      venueId: body.venueId ?? null,
      venue: body.venue ?? "",
      venueDetails: body.venueDetails,
    });

    const tenantUsers = await listPublicTenantUsersByTenantId(session.tenantId);
    const projectTeam = sanitizeEventProjectTeam(tenantUsers, {
      projectLeaderUserId: body.projectLeaderUserId ?? null,
      projectManagerUserIds: body.projectManagerUserIds ?? [],
    });

    const startDate = normalizeMeetingDateInput(body.startDate);
    const endDate = normalizeMeetingDateInput(body.endDate || body.startDate);

    const requiredError = validateEventRequiredFields({
      title: body.title ?? "",
      venue: venueFields.venue,
      venueDetails: venueFields.venueDetails,
      startDate,
      endDate,
      categoryId: body.categoryId ?? "evento_aziendale",
      healthAreaId: body.healthAreaId ?? null,
      ecmEnabled: body.ecmEnabled ?? null,
      ecmModality: body.ecmModality ?? null,
      formationEventTypeId: body.formationEventTypeId ?? null,
      formationStructureName: body.formationStructureName ?? null,
      projectLeaderUserId: projectTeam.projectLeaderUserId,
    });
    if (requiredError) {
      return NextResponse.json({ error: requiredError }, { status: 400 });
    }

    const event = createEvent(session, {
      cdc: body.cdc ?? "",
      title: body.title!,
      venue: venueFields.venue,
      venueId: venueFields.venueId,
      venueDetails: venueFields.venueDetails,
      startDate,
      endDate,
      categoryId: body.categoryId,
      healthAreaId: body.healthAreaId ?? null,
      ecmEnabled: body.ecmEnabled ?? null,
      ecmModality: body.ecmModality ?? null,
      formationEventTypeId: body.formationEventTypeId ?? null,
      formationStructureName: body.formationStructureName ?? null,
      type: body.type,
      notes: body.notes ?? "",
      projectLeaderUserId: projectTeam.projectLeaderUserId,
      projectManagerUserIds: projectTeam.projectManagerUserIds,
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
    return handleLeanEventRouteError(error, "Creazione evento non riuscita.");
  }
}
