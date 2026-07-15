import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import {
  createVenue,
  listVenues,
  saveVenue,
} from "@/lib/lean-event/venues";
import {
  forbiddenResponse,
  handleLeanEventRouteError,
  requireSession,
} from "@/lib/lean-event/server-auth";

export async function GET() {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "eventi")
    ) {
      return forbiddenResponse();
    }

    const venues = await listVenues(session.tenantId);
    return NextResponse.json({ venues });
  } catch (error) {
    return handleLeanEventRouteError(error, "Caricamento sedi non riuscito.");
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
      name?: string;
      address?: string;
      city?: string;
      province?: string;
      postalCode?: string;
      phone?: string;
      email?: string;
      website?: string;
      externalUrl?: string;
      coverImageUrl?: string;
      notes?: string;
    };

    if (!body.name?.trim() || !body.address?.trim() || !body.city?.trim() || !body.province?.trim()) {
      return NextResponse.json(
        { error: "Nome sede, indirizzo, città e provincia sono obbligatori." },
        { status: 400 }
      );
    }

    const venue = createVenue(session, {
      name: body.name,
      address: body.address,
      city: body.city,
      province: body.province,
      postalCode: body.postalCode,
      phone: body.phone,
      email: body.email,
      website: body.website,
      externalUrl: body.externalUrl,
      coverImageUrl: body.coverImageUrl,
      notes: body.notes,
    });

    await saveVenue(venue);
    return NextResponse.json({ venue });
  } catch (error) {
    return handleLeanEventRouteError(error, "Creazione sede non riuscita.");
  }
}
