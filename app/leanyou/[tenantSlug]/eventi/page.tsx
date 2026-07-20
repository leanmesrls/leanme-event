import { notFound, redirect } from "next/navigation";

import { LeonardoEventList } from "@/components/lean-event/LeonardoEventList";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanEventLeonardoEventiPath,
  leanEventLeonardoPath,
  leanEventLoginPath,
} from "@/lib/lean-event/paths";
import { getSession } from "@/lib/lean-event/session";
import { listEvents } from "@/lib/lean-event/events";
import { listPublicTenantUsersByTenantId } from "@/lib/lean-event/tenant-users";
import { listVenues } from "@/lib/lean-event/venues";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug } = await params;

  return createPageMetadata({
    title: "Lean Event · Eventi",
    description: "Gestione eventi Leonardo.",
    path: leanEventLeonardoEventiPath(tenantSlug),
    noIndex: true,
  });
}

export default async function LeonardoEventiPage({ params }: PageProps) {
  const { tenantSlug } = await params;
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

  const [events, venues, tenantUsers] = await Promise.all([
    listEvents(session.tenantId),
    listVenues(session.tenantId),
    listPublicTenantUsersByTenantId(session.tenantId),
  ]);

  return (
      <LeonardoEventList
        tenantSlug={tenantSlug}
        initialEvents={events}
        venues={venues}
        tenantUsers={tenantUsers}
      />
    );
}
