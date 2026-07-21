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
import type { LeanEventSupplier } from "@/types/lean-event";
import {
  deleteSupplier,
  getSupplier,
  saveSupplier,
} from "@/lib/lean-event/suppliers";
import { sessionUserId } from "@/lib/lean-event/entity-lifecycle";
import { isValidSupplierCategory } from "@/lib/lean-event/supplier-categories";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "fornitori")
    ) {
      return forbiddenResponse();
    }

    const { id } = await context.params;
    const supplier = await getSupplier(session.tenantId, id);
    if (!supplier) {
      return NextResponse.json({ error: "Fornitore non trovato." }, { status: 404 });
    }

    return NextResponse.json({ supplier });
  } catch (error) {
    return handleLeanEventRouteError(error, "Caricamento fornitore non riuscito.");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "fornitori")
    ) {
      return forbiddenResponse();
    }

    const { id } = await context.params;
    const supplier = await getSupplier(session.tenantId, id);
    if (!supplier) {
      return NextResponse.json({ error: "Fornitore non trovato." }, { status: 404 });
    }

    const body = (await request.json()) as Partial<LeanEventSupplier> & {
      expectedRevision?: number;
    };

    const next: LeanEventSupplier = {
      ...supplier,
      name: body.name !== undefined ? body.name.trim() : supplier.name,
      categoryId:
        body.categoryId !== undefined && isValidSupplierCategory(body.categoryId)
          ? body.categoryId
          : supplier.categoryId,
      email: body.email !== undefined ? body.email.trim() : supplier.email,
      phone: body.phone !== undefined ? body.phone.trim() : supplier.phone,
      address:
        body.address !== undefined ? body.address.trim() : supplier.address,
      city: body.city !== undefined ? body.city.trim() : supplier.city,
      province:
        body.province !== undefined
          ? body.province.trim().toUpperCase()
          : supplier.province,
      region:
        body.region !== undefined ? body.region.trim() : supplier.region ?? "",
      postalCode:
        body.postalCode !== undefined
          ? body.postalCode.trim()
          : supplier.postalCode ?? "",
      country:
        body.country !== undefined
          ? body.country.trim()
          : supplier.country ?? "",
      vatNumber:
        body.vatNumber !== undefined ? body.vatNumber.trim() : supplier.vatNumber,
      contactPerson:
        body.contactPerson !== undefined
          ? body.contactPerson.trim()
          : supplier.contactPerson,
      notes: body.notes !== undefined ? body.notes.trim() : supplier.notes,
    };

    const saved = await saveSupplier(next, {
      expectedRevision: body.expectedRevision,
      userId: sessionUserId(session),
    });
    return NextResponse.json({ supplier: saved });
  } catch (error) {
    return handleLeanEventRouteError(error, "Aggiornamento fornitore non riuscito.");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "fornitori")
    ) {
      return forbiddenResponse();
    }

    const { id } = await context.params;
    await deleteSupplier(session.tenantId, id, sessionUserId(session));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleLeanEventRouteError(error, "Eliminazione fornitore non riuscita.");
  }
}
