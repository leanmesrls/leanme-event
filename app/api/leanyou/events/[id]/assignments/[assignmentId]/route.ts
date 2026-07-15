import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/leanyou/auth";
import {
  deleteEventContactAssignment,
  getAssignment,
  listAssignmentsForEventWithContacts,
  updateEventContactAssignment,
} from "@/lib/leanyou/event-assignments";
import { getEvent } from "@/lib/leanyou/events";
import { sessionUserId } from "@/lib/leanyou/entity-lifecycle";
import { validateAllotmentAssignment } from "@/lib/leanyou/allotment-report";
import {
  forbiddenResponse,
  handleLeanYouRouteError,
  requireSession,
} from "@/lib/leanyou/server-auth";
import type { LeonardoAssignmentHospitality, LeonardoRelatedEventParticipation } from "@/types/leanyou";

interface RouteContext {
  params: Promise<{ id: string; assignmentId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "ospiti")
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

    const body = (await request.json()) as {
      notes?: string;
      hospitality?: LeonardoAssignmentHospitality;
      relatedParticipations?: LeonardoRelatedEventParticipation[];
      expectedRevision?: number;
    };

    if (body.hospitality) {
      const assignments = await listAssignmentsForEventWithContacts(
        session.tenantId,
        eventId
      );
      const validation = validateAllotmentAssignment(
        event,
        assignments,
        assignmentId,
        body.hospitality
      );
      if (!validation.ok) {
        return NextResponse.json({ error: validation.message }, { status: 409 });
      }
    }

    try {
      const updated = await updateEventContactAssignment(
        session.tenantId,
        assignmentId,
        {
          ...body,
          userId: sessionUserId(session),
        }
      );
      const assignments = await listAssignmentsForEventWithContacts(
        session.tenantId,
        eventId
      );
      const enriched = assignments.find((item) => item.id === updated.id);
      return NextResponse.json({ assignment: enriched ?? updated });
    } catch (error) {
      if (error instanceof Error && error.message === "ASSIGNMENT_NOT_FOUND") {
        return NextResponse.json(
          { error: "Assegnazione non trovata." },
          { status: 404 }
        );
      }
      throw error;
    }
  } catch (error) {
    return handleLeanYouRouteError(
      error,
      "Aggiornamento scheda ospitalità non riuscito."
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "ospiti")
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

    await deleteEventContactAssignment(
      session.tenantId,
      assignmentId,
      sessionUserId(session)
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleLeanYouRouteError(
      error,
      "Rimozione assegnazione non riuscita."
    );
  }
}
