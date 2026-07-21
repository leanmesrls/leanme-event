import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import { LeonardoEventDetail } from "@/components/lean-event/LeonardoEventDetail";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanEventLeonardoEventPath,
  leanEventLeonardoEventiPath,
  leanEventLeonardoPath,
  leanEventLoginPath,
} from "@/lib/lean-event/paths";
import { getSessionLeonardoCapabilities } from "@/lib/lean-event/capabilities";
import { listContacts } from "@/lib/lean-event/contacts";
import { listAssignmentsForEventWithContacts } from "@/lib/lean-event/event-assignments";
import { listEventSuppliersWithSupplier } from "@/lib/lean-event/event-suppliers";
import { getEvent, listEvents } from "@/lib/lean-event/events";
import { listSuppliers } from "@/lib/lean-event/suppliers";
import { getSession } from "@/lib/lean-event/session";
import { listVenues } from "@/lib/lean-event/venues";
import { listPublicTenantUsersByTenantId } from "@/lib/lean-event/tenant-users";
import { listWorkspacesForEvent } from "@/lib/lean-event/workspaces";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ tenantSlug: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug, id } = await params;

  return createPageMetadata({
    title: `Lean Event · Evento ${id.slice(0, 8)}`,
    description: "Dettaglio evento Leonardo.",
    path: leanEventLeonardoEventPath(tenantSlug, id),
    noIndex: true,
  });
}

export default async function LeonardoEventiDetailPage({ params }: PageProps) {
  const { tenantSlug, id } = await params;
  const tenant = await findTenantBySlug(tenantSlug);
  if (!tenant) {
    notFound();
  }

  const session = await getSession();
  if (!session) {
    redirect(leanEventLoginPath());
  }
  if (
    !tenantHasModule(session, "events") ||
    !tenantHasLeonardoCapability(session, "eventi")
  ) {
    redirect(leanEventLeonardoPath(tenantSlug));
  }

  const event = await getEvent(session.tenantId, id);
  if (!event) {
    redirect(`${leanEventLeonardoEventiPath(tenantSlug)}?event=missing`);
  }

  const capabilities = getSessionLeonardoCapabilities(session);
  const [linkedWorkspaces, assignments, contacts, venues, allEvents, supplierLinks, rubricaSuppliers, tenantUsers] =
    await Promise.all([
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

  const otherEvents = allEvents.filter((item) => item.id !== id);

  return (
      <Suspense fallback={<p className="text-sm text-white/50">Caricamento evento…</p>}>
        <LeonardoEventDetail
        tenantSlug={tenantSlug}
        initialEvent={event}
        venues={venues}
        linkedWorkspaces={linkedWorkspaces}
        initialAssignments={assignments}
        contacts={contacts}
        initialSupplierLinks={supplierLinks}
        rubricaSuppliers={rubricaSuppliers}
        otherEvents={otherEvents}
        tenantUsers={tenantUsers}
        ospitiEnabled={capabilities.ospiti}
        hotelEnabled={capabilities.hotel}
        logisticaEnabled={capabilities.logistica}
        moduleCapabilities={capabilities}
        currentUserName={session.userName}
        currentUserEmail={session.userEmail}
        />
      </Suspense>
    );
}
