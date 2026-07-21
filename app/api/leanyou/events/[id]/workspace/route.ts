import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import { getSessionLeonardoCapabilities } from "@/lib/lean-event/capabilities";
import { listContacts } from "@/lib/lean-event/contacts";
import { listAssignmentsForEventWithContacts } from "@/lib/lean-event/event-assignments";
import { listEventSuppliersWithSupplier } from "@/lib/lean-event/event-suppliers";
import { getEvent, listEvents } from "@/lib/lean-event/events";
import {
  forbiddenResponse,
  handleLeanEventRouteError,
  requireSession,
} from "@/lib/lean-event/server-auth";
import { listSuppliers } from "@/lib/lean-event/suppliers";
import { listVenues } from "@/lib/lean-event/venues";
import { listPublicTenantUsersByTenantId } from "@/lib/lean-event/tenant-users";
import { listWorkspacesForEvent } from "@/lib/lean-event/workspaces";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Payload aggregato per aprire un evento in work-tab (client). */
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
    const event = await getEvent(session.tenantId, id);
    if (!event) {
      return NextResponse.json({ error: "Evento non trovato." }, { status: 404 });
    }

    const capabilities = getSessionLeonardoCapabilities(session);
    const [
      linkedWorkspaces,
      assignments,
      contacts,
      venues,
      allEvents,
      supplierLinks,
      rubricaSuppliers,
      tenantUsers,
    ] = await Promise.all([
      listWorkspacesForEvent(session.tenantId, id),
      capabilities.ospiti
        ? listAssignmentsForEventWithContacts(session.tenantId, id)
        : Promise.resolve([]),
      tenantHasLeonardoCapability(session, "contatti")
        ? listContacts(session.tenantId)
        : Promise.resolve([]),
      listVenues(session.tenantId),
      listEvents(session.tenantId),
      listEventSuppliersWithSupplier(session.tenantId, id),
      tenantHasLeonardoCapability(session, "fornitori")
        ? listSuppliers(session.tenantId)
        : Promise.resolve([]),
      listPublicTenantUsersByTenantId(session.tenantId),
    ]);

    return NextResponse.json({
      event,
      venues,
      linkedWorkspaces,
      assignments,
      contacts,
      supplierLinks,
      rubricaSuppliers,
      otherEvents: allEvents.filter((item) => item.id !== id),
      tenantUsers,
      ospitiEnabled: capabilities.ospiti,
      hotelEnabled: capabilities.hotel,
      logisticaEnabled: capabilities.logistica,
      moduleCapabilities: capabilities,
      currentUserName: session.userName,
      currentUserEmail: session.userEmail,
    });
  } catch (error) {
    return handleLeanEventRouteError(
      error,
      "Caricamento workspace evento non riuscito."
    );
  }
}
