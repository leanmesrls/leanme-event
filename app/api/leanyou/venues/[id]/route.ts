import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import { sessionUserId } from "@/lib/lean-event/entity-lifecycle";
import { normalizeVenue, clampInternalRating } from "@/lib/lean-event/venue-normalize";
import {
  deleteVenue,
  getVenue,
  saveVenue,
} from "@/lib/lean-event/venues";
import {
  forbiddenResponse,
  handleLeanEventRouteError,
  requireSession,
} from "@/lib/lean-event/server-auth";
import type { LeonardoVenue } from "@/types/lean-event";

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
    const venue = await getVenue(session.tenantId, id);
    if (!venue) {
      return NextResponse.json({ error: "Sede non trovata." }, { status: 404 });
    }

    return NextResponse.json({ venue });
  } catch (error) {
    return handleLeanEventRouteError(error, "Caricamento sede non riuscito.");
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
    const venue = await getVenue(session.tenantId, id);
    if (!venue) {
      return NextResponse.json({ error: "Sede non trovata." }, { status: 404 });
    }

    const body = (await request.json()) as Partial<LeonardoVenue> & {
      expectedRevision?: number;
    };

    const next = normalizeVenue({
      ...venue,
      name: body.name !== undefined ? body.name.trim() : venue.name,
      address: body.address !== undefined ? body.address.trim() : venue.address,
      city: body.city !== undefined ? body.city.trim() : venue.city,
      province:
        body.province !== undefined ? body.province.trim().toUpperCase() : venue.province,
      postalCode:
        body.postalCode !== undefined ? body.postalCode.trim() : venue.postalCode,
      phone: body.phone !== undefined ? body.phone.trim() : venue.phone,
      email: body.email !== undefined ? body.email.trim() : venue.email,
      website: body.website !== undefined ? body.website.trim() : venue.website,
      externalUrl:
        body.externalUrl !== undefined ? body.externalUrl.trim() : venue.externalUrl,
      coverImageUrl:
        body.coverImageUrl !== undefined
          ? body.coverImageUrl.trim()
          : venue.coverImageUrl ?? "",
      starCategory:
        body.starCategory !== undefined
          ? body.starCategory.trim()
          : venue.starCategory ?? "",
      internalRating:
        body.internalRating !== undefined
          ? clampInternalRating(body.internalRating)
          : venue.internalRating ?? 0,
      internalReview:
        body.internalReview !== undefined
          ? body.internalReview.trim()
          : venue.internalReview ?? "",
      notes: body.notes !== undefined ? body.notes.trim() : venue.notes,
    });

    const saved = await saveVenue(next, {
      expectedRevision: body.expectedRevision,
      userId: sessionUserId(session),
    });
    return NextResponse.json({ venue: saved });
  } catch (error) {
    return handleLeanEventRouteError(error, "Aggiornamento sede non riuscito.");
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
    await deleteVenue(session.tenantId, id, sessionUserId(session));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleLeanEventRouteError(error, "Eliminazione sede non riuscita.");
  }
}
