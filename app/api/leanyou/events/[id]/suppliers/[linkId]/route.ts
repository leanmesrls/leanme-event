import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/leanyou/auth";
import {
  deleteEventSupplierLink,
  getEventSupplierLink,
  saveEventSupplierLink,
} from "@/lib/leanyou/event-suppliers";
import {
  forbiddenResponse,
  handleLeanYouRouteError,
  requireSession,
} from "@/lib/leanyou/server-auth";
import { isValidSupplierCategory } from "@/lib/leanyou/supplier-categories";

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
    return handleLeanYouRouteError(error, "Caricamento fornitore evento non riuscito.");
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
    };

    const next = {
      ...link,
      categoryId:
        body.categoryId && isValidSupplierCategory(body.categoryId)
          ? body.categoryId
          : link.categoryId,
      roleNotes:
        body.roleNotes !== undefined ? body.roleNotes.trim() : link.roleNotes,
      updatedAt: new Date().toISOString(),
    };

    await saveEventSupplierLink(next);
    return NextResponse.json({ link: next });
  } catch (error) {
    return handleLeanYouRouteError(error, "Aggiornamento fornitore evento non riuscito.");
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

    await deleteEventSupplierLink(session.tenantId, linkId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleLeanYouRouteError(error, "Rimozione fornitore evento non riuscita.");
  }
}
