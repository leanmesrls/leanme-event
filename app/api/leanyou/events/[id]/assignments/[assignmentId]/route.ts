import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import {
  deleteEventContactAssignment,
  getAssignment,
  listAssignmentsForEventWithContacts,
  updateEventContactAssignment,
} from "@/lib/lean-event/event-assignments";
import { getEvent } from "@/lib/lean-event/events";
import { sessionUserId } from "@/lib/lean-event/entity-lifecycle";
import { validateAllotmentAssignment } from "@/lib/lean-event/allotment-report";
import {
  forbiddenResponse,
  handleLeanEventRouteError,
  requireSession,
} from "@/lib/lean-event/server-auth";
import type { LeonardoAssignmentHospitality, LeonardoRelatedEventParticipation } from "@/types/lean-event";

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
          session,
        }
      );
      const assignments = await listAssignmentsForEventWithContacts(
        session.tenantId,
        eventId
      );
      const enriched = assignments.find((item) => item.id === updated.id);
      return NextResponse.json({ assignment: enriched ?? updated });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "ASSIGNMENT_NOT_FOUND") {
          return NextResponse.json(
            { error: "Assegnazione non trovata." },
            { status: 404 }
          );
        }
        if (error.message === "ROOMMATE_PARTICIPANT_EMAIL_REQUIRED") {
          return NextResponse.json(
            {
              error:
                "Email obbligatoria per iscrivere il compagno di camera come partecipante ospite.",
            },
            { status: 400 }
          );
        }
        if (error.message === "ROOMMATE_PARTICIPANT_NAME_REQUIRED") {
          return NextResponse.json(
            {
              error:
                "Nome e cognome obbligatori per il compagno di camera partecipante.",
            },
            { status: 400 }
          );
        }
      }
      throw error;
    }
  } catch (error) {
    return handleLeanEventRouteError(
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

    try {
      await deleteEventContactAssignment(
        session.tenantId,
        assignmentId,
        sessionUserId(session)
      );
      return NextResponse.json({ ok: true });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "ASSIGNMENT_NOT_FOUND") {
          return NextResponse.json(
            { error: "Assegnazione non trovata." },
            { status: 404 }
          );
        }
        if (error.message === "ASSIGNMENT_ALREADY_DELETED") {
          return NextResponse.json(
            { error: "Assegnazione già rimossa." },
            { status: 409 }
          );
        }
        if (error.message === "ASSIGNMENT_DELETE_FAILED") {
          return NextResponse.json(
            {
              error:
                "Rimozione non confermata dal server. Ricarica la pagina e riprova.",
            },
            { status: 500 }
          );
        }
      }
      throw error;
    }
  } catch (error) {
    return handleLeanEventRouteError(
      error,
      "Rimozione assegnazione non riuscita."
    );
  }
}
