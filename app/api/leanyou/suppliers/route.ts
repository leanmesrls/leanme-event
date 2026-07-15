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
import { createSupplier, listSuppliers, saveSupplier } from "@/lib/leanyou/suppliers";

export async function GET() {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "fornitori")
    ) {
      return forbiddenResponse();
    }

    const suppliers = await listSuppliers(session.tenantId);
    return NextResponse.json({ suppliers });
  } catch (error) {
    return handleLeanYouRouteError(error, "Caricamento fornitori non riuscito.");
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "fornitori")
    ) {
      return forbiddenResponse();
    }

    const body = (await request.json()) as {
      name?: string;
      categoryId?: string;
      email?: string;
      phone?: string;
      address?: string;
      city?: string;
      province?: string;
      vatNumber?: string;
      contactPerson?: string;
      notes?: string;
    };

    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: "Ragione sociale obbligatoria." },
        { status: 400 }
      );
    }

    const supplier = createSupplier(session, {
      name: body.name,
      categoryId: body.categoryId ?? "collaboratori",
      email: body.email,
      phone: body.phone,
      address: body.address,
      city: body.city,
      province: body.province,
      vatNumber: body.vatNumber,
      contactPerson: body.contactPerson,
      notes: body.notes,
    });

    await saveSupplier(supplier);
    return NextResponse.json({ supplier });
  } catch (error) {
    return handleLeanYouRouteError(error, "Creazione fornitore non riuscita.");
  }
}
