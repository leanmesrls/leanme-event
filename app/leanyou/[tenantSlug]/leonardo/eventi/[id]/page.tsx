import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import { LeanYouShell } from "@/components/leanyou/LeanYouShell";
import { LeonardoEventDetail } from "@/components/leanyou/LeonardoEventDetail";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/leanyou/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanyouLeonardoEventPath,
  leanyouLeonardoEventiPath,
  leanyouLeonardoPath,
  leanyouLoginPath,
} from "@/lib/leanyou/paths";
import { getSessionLeonardoCapabilities } from "@/lib/leanyou/capabilities";
import { listContacts } from "@/lib/leanyou/contacts";
import { listAssignmentsForEventWithContacts } from "@/lib/leanyou/event-assignments";
import { listEventSuppliersWithSupplier } from "@/lib/leanyou/event-suppliers";
import { getEvent, listEvents } from "@/lib/leanyou/events";
import { listSuppliers } from "@/lib/leanyou/suppliers";
import { getSession } from "@/lib/leanyou/session";
import { listVenues } from "@/lib/leanyou/venues";
import { listWorkspacesForEvent } from "@/lib/leanyou/workspaces";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ tenantSlug: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug, id } = await params;

  return createPageMetadata({
    title: `LeanYou · Evento ${id.slice(0, 8)}`,
    description: "Dettaglio evento Leonardo.",
    path: leanyouLeonardoEventPath(tenantSlug, id),
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
    redirect(leanyouLoginPath());
  }
  if (
    !tenantHasModule(session, "events") ||
    !tenantHasLeonardoCapability(session, "eventi")
  ) {
    redirect(leanyouLeonardoPath(tenantSlug));
  }

  const event = await getEvent(session.tenantId, id);
  if (!event) {
    redirect(`${leanyouLeonardoEventiPath(tenantSlug)}?event=missing`);
  }

  const capabilities = getSessionLeonardoCapabilities(session);
  const [linkedWorkspaces, assignments, contacts, venues, allEvents, supplierLinks, rubricaSuppliers] =
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
  ]);

  const otherEvents = allEvents.filter((item) => item.id !== id);

  return (
    <LeanYouShell session={session}>
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
        ospitiEnabled={capabilities.ospiti}
        hotelEnabled={capabilities.hotel}
        logisticaEnabled={capabilities.logistica}
        currentUserName={session.userName}
        currentUserEmail={session.userEmail}
        />
      </Suspense>
    </LeanYouShell>
  );
}
