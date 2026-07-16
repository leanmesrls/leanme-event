import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import {
  deleteEventSupplierLink,
  getEventSupplierLink,
  saveEventSupplierLink,
} from "@/lib/lean-event/event-suppliers";
import {
  isRevisionConflictError,
  sessionUserId,
} from "@/lib/lean-event/entity-lifecycle";
import {
  forbiddenResponse,
  handleLeanEventRouteError,
  requireSession,
} from "@/lib/lean-event/server-auth";
import { isValidSupplierCategory } from "@/lib/lean-event/supplier-categories";
import { revisionConflictResponse } from "@/lib/lean-event/revision-conflict";

interface RouteContext {
  params: Promise<{ id: string; linkId: string }>;
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

    const { id: eventId, linkId } = await context.params;
    const link = await getEventSupplierLink(session.tenantId, linkId);
    if (!link || link.eventId !== eventId) {
      return NextResponse.json({ error: "Fornitore evento non trovato." }, { status: 404 });
    }

    return NextResponse.json({ link });
  } catch (error) {
    return handleLeanEventRouteError(error, "Caricamento fornitore evento non riuscito.");
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

    const { id: eventId, linkId } = await context.params;
    const link = await getEventSupplierLink(session.tenantId, linkId);
    if (!link || link.eventId !== eventId) {
      return NextResponse.json({ error: "Fornitore evento non trovato." }, { status: 404 });
    }

    const body = (await request.json()) as {
      categoryId?: string;
      roleNotes?: string;
      expectedRevision?: number;
    };

    const next = {
      ...link,
      categoryId:
        body.categoryId && isValidSupplierCategory(body.categoryId)
          ? body.categoryId
          : link.categoryId,
      roleNotes:
        body.roleNotes !== undefined ? body.roleNotes.trim() : link.roleNotes,
    };

    try {
      const saved = await saveEventSupplierLink(next, {
        expectedRevision: body.expectedRevision,
        userId: sessionUserId(session),
        previous: link,
      });
      return NextResponse.json({ link: saved });
    } catch (error) {
      if (isRevisionConflictError(error)) {
        return revisionConflictResponse(error);
      }
      throw error;
    }
  } catch (error) {
    return handleLeanEventRouteError(error, "Aggiornamento fornitore evento non riuscito.");
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

    const { id: eventId, linkId } = await context.params;
    const link = await getEventSupplierLink(session.tenantId, linkId);
    if (!link || link.eventId !== eventId) {
      return NextResponse.json({ error: "Fornitore evento non trovato." }, { status: 404 });
    }

    await deleteEventSupplierLink(
      session.tenantId,
      linkId,
      sessionUserId(session)
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleLeanEventRouteError(error, "Rimozione fornitore evento non riuscita.");
  }
}
