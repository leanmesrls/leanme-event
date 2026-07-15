import { notFound, redirect } from "next/navigation";

import { LeanEventShell } from "@/components/lean-event/LeanEventShell";
import { LeonardoHub } from "@/components/lean-event/LeonardoHub";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
} from "@/lib/lean-event/auth";
import { getSessionLeonardoCapabilities } from "@/lib/lean-event/capabilities";
import { listContacts } from "@/lib/lean-event/contacts";
import { listEvents } from "@/lib/lean-event/events";
import { listSuppliers } from "@/lib/lean-event/suppliers";
import { createPageMetadata } from "@/lib/metadata";
import { leanEventLeonardoPath, leanEventLoginPath } from "@/lib/lean-event/paths";
import { getSession } from "@/lib/lean-event/session";
import { listVenues } from "@/lib/lean-event/venues";
import { listWorkspaces } from "@/lib/lean-event/workspaces";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug } = await params;

  return createPageMetadata({
    title: "Lean Event · Leonardo",
    description: "Piattaforma gestionale Leonardo.",
    path: leanEventLeonardoPath(tenantSlug),
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
    redirect(leanEventLoginPath());
  }

  const capabilities = getSessionLeonardoCapabilities(session);
  if (!capabilities.hub) {
    redirect(leanEventLoginPath());
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
    <LeanEventShell session={session}>
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
    </LeanEventShell>
  );
}
