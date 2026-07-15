import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/leanyou/auth";
import {
  createEventContactAssignment,
  isValidRoleCategory,
  listAssignmentsForEventWithContacts,
  listEventRoleCategories,
} from "@/lib/leanyou/event-assignments";
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
      !tenantHasLeonardoCapability(session, "ospiti")
    ) {
      return forbiddenResponse();
    }

    const { id: eventId } = await context.params;
    const event = await getEvent(session.tenantId, eventId);
    if (!event) {
      return NextResponse.json({ error: "Evento non trovato." }, { status: 404 });
    }

    const assignments = await listAssignmentsForEventWithContacts(
      session.tenantId,
      eventId
    );

    return NextResponse.json({
      assignments,
      roleCategories: listEventRoleCategories(),
    });
  } catch (error) {
    return handleLeanYouRouteError(
      error,
      "Caricamento ospiti evento non riuscito."
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "ospiti")
    ) {
      return forbiddenResponse();
    }

    const { id: eventId } = await context.params;
    const event = await getEvent(session.tenantId, eventId);
    if (!event) {
      return NextResponse.json({ error: "Evento non trovato." }, { status: 404 });
    }

    const body = (await request.json()) as {
      contactId?: string;
      roleCategory?: string;
      notes?: string;
    };

    if (!body.contactId?.trim()) {
      return NextResponse.json(
        { error: "Seleziona un contatto dalla rubrica." },
        { status: 400 }
      );
    }

    if (!body.roleCategory || !isValidRoleCategory(body.roleCategory)) {
      return NextResponse.json(
        { error: "Seleziona un ruolo valido." },
        { status: 400 }
      );
    }

    try {
      const assignment = await createEventContactAssignment(session, {
        eventId,
        contactId: body.contactId.trim(),
        roleCategory: body.roleCategory,
        notes: body.notes,
      });

      const assignments = await listAssignmentsForEventWithContacts(
        session.tenantId,
        eventId
      );
      const enriched = assignments.find((item) => item.id === assignment.id);

      return NextResponse.json({
        assignment: enriched ?? assignment,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "CONTACT_NOT_FOUND") {
          return NextResponse.json(
            { error: "Contatto non trovato in rubrica." },
            { status: 404 }
          );
        }
        if (error.message === "ASSIGNMENT_DUPLICATE") {
          return NextResponse.json(
            {
              error:
                "Questo contatto ha già lo stesso ruolo su questo evento.",
            },
            { status: 409 }
          );
        }
      }
      throw error;
    }
  } catch (error) {
    return handleLeanYouRouteError(
      error,
      "Assegnazione ospite non riuscita."
    );
  }
}
