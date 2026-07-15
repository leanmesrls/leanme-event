import { notFound, redirect } from "next/navigation";

import { LeanYouShell } from "@/components/leanyou/LeanYouShell";
import { LeonardoHub } from "@/components/leanyou/LeonardoHub";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
} from "@/lib/leanyou/auth";
import { getSessionLeonardoCapabilities } from "@/lib/leanyou/capabilities";
import { listContacts } from "@/lib/leanyou/contacts";
import { listEvents } from "@/lib/leanyou/events";
import { listSuppliers } from "@/lib/leanyou/suppliers";
import { createPageMetadata } from "@/lib/metadata";
import { leanyouLeonardoPath, leanyouLoginPath } from "@/lib/leanyou/paths";
import { getSession } from "@/lib/leanyou/session";
import { listVenues } from "@/lib/leanyou/venues";
import { listWorkspaces } from "@/lib/leanyou/workspaces";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug } = await params;

  return createPageMetadata({
    title: "LeanYou · Leonardo",
    description: "Piattaforma gestionale Leonardo.",
    path: leanyouLeonardoPath(tenantSlug),
    noIndex: true,
  });
}

export default async function LeonardoHubPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const tenant = await findTenantBySlug(tenantSlug);
  if (!tenant) {
    notFound();
  }

  const session = await getSession();
  if (!session) {
    redirect(leanyouLoginPath());
  }

  const capabilities = getSessionLeonardoCapabilities(session);
  if (!capabilities.hub) {
    redirect(leanyouLoginPath());
  }

  const [workspaces, events, contacts, venues, suppliers] = await Promise.all([
    tenantHasLeonardoCapability(session, "verbali")
      ? listWorkspaces(session.tenantId)
      : Promise.resolve([]),
    tenantHasLeonardoCapability(session, "eventi")
      ? listEvents(session.tenantId)
      : Promise.resolve([]),
    tenantHasLeonardoCapability(session, "contatti")
      ? listContacts(session.tenantId)
      : Promise.resolve([]),
    tenantHasLeonardoCapability(session, "eventi")
      ? listVenues(session.tenantId)
      : Promise.resolve([]),
    tenantHasLeonardoCapability(session, "fornitori")
      ? listSuppliers(session.tenantId)
      : Promise.resolve([]),
  ]);

  return (
    <LeanYouShell session={session}>
      <LeonardoHub
        tenantSlug={tenantSlug}
        workspaces={workspaces}
        events={events}
        contactCount={contacts.length}
        venueCount={venues.length}
        supplierCount={suppliers.length}
        verbaliEnabled={capabilities.verbali}
        eventiEnabled={capabilities.eventi}
        fornitoriEnabled={capabilities.fornitori}
      />
    </LeanYouShell>
  );
}
