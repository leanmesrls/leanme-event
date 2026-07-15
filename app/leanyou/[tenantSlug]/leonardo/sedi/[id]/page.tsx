import { notFound, redirect } from "next/navigation";

import { LeanYouShell } from "@/components/leanyou/LeanYouShell";
import { LeonardoVenueDetail } from "@/components/leanyou/LeonardoVenueDetail";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/leanyou/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanyouLeonardoPath,
  leanyouLeonardoVenuePath,
  leanyouLoginPath,
} from "@/lib/leanyou/paths";
import { getSession } from "@/lib/leanyou/session";
import { getVenue } from "@/lib/leanyou/venues";

interface PageProps {
  params: Promise<{ tenantSlug: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug, id } = await params;

  return createPageMetadata({
    title: "LeanYou · Scheda sede",
    description: "Dettaglio sede Leonardo.",
    path: leanyouLeonardoVenuePath(tenantSlug, id),
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
    redirect(leanyouLoginPath());
  }
  if (
    !tenantHasModule(session, "events") ||
    !tenantHasLeonardoCapability(session, "eventi")
  ) {
    redirect(leanyouLeonardoPath(tenantSlug));
  }

  const venue = await getVenue(session.tenantId, id);
  if (!venue) {
    notFound();
  }

  return (
    <LeanYouShell session={session}>
      <LeonardoVenueDetail tenantSlug={tenantSlug} initialVenue={venue} />
    </LeanYouShell>
  );
}
