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
import { listTrashItems } from "@/lib/lean-event/trash";

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
    return handleLeanEventRouteError(error, "Caricamento cestino non riuscito.");
  }
}
