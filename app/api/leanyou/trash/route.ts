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
import { listTrashItems } from "@/lib/leanyou/trash";

export async function GET() {
  try {
    const session = await requireSession();
    if (!tenantHasModule(session, "events")) {
      return forbiddenResponse();
    }
    if (
      !tenantHasLeonardoCapability(session, "eventi") &&
      !tenantHasLeonardoCapability(session, "contatti") &&
      !tenantHasLeonardoCapability(session, "fornitori")
    ) {
      return forbiddenResponse();
    }

    const items = await listTrashItems(session.tenantId);
    return NextResponse.json({ items });
  } catch (error) {
    return handleLeanYouRouteError(error, "Caricamento cestino non riuscito.");
  }
}
