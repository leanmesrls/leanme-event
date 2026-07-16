import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import { getEvent } from "@/lib/lean-event/events";
import {
  createEventSupplierLink,
  listEventSuppliersWithSupplier,
  saveEventSupplierLink,
} from "@/lib/lean-event/event-suppliers";
import {
  forbiddenResponse,
  handleLeanEventRouteError,
  requireSession,
} from "@/lib/lean-event/server-auth";

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

    const { id: eventId } = await context.params;
    const event = await getEvent(session.tenantId, eventId);
    if (!event) {
      return NextResponse.json({ error: "Evento non trovato." }, { status: 404 });
    }

    const links = await listEventSuppliersWithSupplier(session.tenantId, eventId);
    return NextResponse.json({ links });
  } catch (error) {
    return handleLeanEventRouteError(
      error,
      "Caricamento fornitori evento non riuscito."
    );
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

    const body = (await request.json()) as {
      supplierId?: string;
      categoryId?: string;
      roleNotes?: string;
    };

    if (!body.supplierId?.trim()) {
      return NextResponse.json(
        { error: "Seleziona un fornitore dalla rubrica." },
        { status: 400 }
      );
    }

    const link = await createEventSupplierLink(session, eventId, {
      supplierId: body.supplierId,
      categoryId: body.categoryId,
      roleNotes: body.roleNotes,
    });

    if (!link) {
      return NextResponse.json(
        { error: "Fornitore non trovato in rubrica." },
        { status: 404 }
      );
    }

    const saved = await saveEventSupplierLink(link, {
      userId: session.userId || session.userEmail,
    });
    return NextResponse.json({ link: saved });
  } catch (error) {
    return handleLeanEventRouteError(
      error,
      "Collegamento fornitore non riuscito."
    );
  }
}
