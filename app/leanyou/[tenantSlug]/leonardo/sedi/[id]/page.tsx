import { notFound, redirect } from "next/navigation";

import { LeanEventShell } from "@/components/lean-event/LeanEventShell";
import { LeonardoVenueDetail } from "@/components/lean-event/LeonardoVenueDetail";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanEventLeonardoPath,
  leanEventLeonardoVenuePath,
  leanEventLoginPath,
} from "@/lib/lean-event/paths";
import { getSession } from "@/lib/lean-event/session";
import { getVenue } from "@/lib/lean-event/venues";

interface PageProps {
  params: Promise<{ tenantSlug: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug, id } = await params;

  return createPageMetadata({
    title: "Lean Event · Scheda sede",
    description: "Dettaglio sede Leonardo.",
    path: leanEventLeonardoVenuePath(tenantSlug, id),
    noIndex: true,
  });
}

export default async function LeonardoVenueDetailPage({ params }: PageProps) {
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

  const venue = await getVenue(session.tenantId, id);
  if (!venue) {
    notFound();
  }

  return (
    <LeanEventShell session={session}>
      <LeonardoVenueDetail tenantSlug={tenantSlug} initialVenue={venue} />
    </LeanEventShell>
  );
}
