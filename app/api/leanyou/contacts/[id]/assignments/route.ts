import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import { getContact } from "@/lib/lean-event/contacts";
import { listAssignmentsForContactWithEvents } from "@/lib/lean-event/event-assignments";
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
      !tenantHasLeonardoCapability(session, "contatti")
    ) {
      return forbiddenResponse();
    }

    const { id } = await context.params;
    const contact = await getContact(session.tenantId, id);
    if (!contact) {
      return NextResponse.json({ error: "Contatto non trovato." }, { status: 404 });
    }

    const assignments = await listAssignmentsForContactWithEvents(
      session.tenantId,
      id
    );
    return NextResponse.json({ assignments });
  } catch (error) {
    return handleLeanEventRouteError(
      error,
      "Caricamento eventi collegati non riuscito."
    );
  }
}
