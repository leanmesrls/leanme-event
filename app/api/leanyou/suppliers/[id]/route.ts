import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/leanyou/auth";
import {
  forbiddenResponse,
  handleLeanYouRouteError,
  requireSession,
} from "@/lib/leanyou/server-auth";
import type { LeanYouSupplier } from "@/types/leanyou";
import {
  deleteSupplier,
  getSupplier,
  saveSupplier,
} from "@/lib/leanyou/suppliers";
import { sessionUserId } from "@/lib/leanyou/entity-lifecycle";
import { isValidSupplierCategory } from "@/lib/leanyou/supplier-categories";

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
    return handleLeanYouRouteError(error, "Caricamento fornitore non riuscito.");
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

    const body = (await request.json()) as Partial<LeanYouSupplier> & {
      expectedRevision?: number;
    };

    const next: LeanYouSupplier = {
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
    return handleLeanYouRouteError(error, "Aggiornamento fornitore non riuscito.");
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
    return handleLeanYouRouteError(error, "Eliminazione fornitore non riuscita.");
  }
}
