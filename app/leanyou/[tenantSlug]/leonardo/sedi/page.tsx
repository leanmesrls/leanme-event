import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import { LeanYouShell } from "@/components/leanyou/LeanYouShell";
import { LeonardoVenueListPageClient } from "@/components/leanyou/LeonardoVenueListPageClient";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/leanyou/auth";
import { getSessionLeonardoCapabilities } from "@/lib/leanyou/capabilities";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanyouLeonardoPath,
  leanyouLeonardoSediPath,
  leanyouLoginPath,
} from "@/lib/leanyou/paths";
import { getSession } from "@/lib/leanyou/session";
import { listVenues } from "@/lib/leanyou/venues";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug } = await params;

  return createPageMetadata({
    title: "LeanYou · Rubrica sedi",
    description: "Rubrica sedi Leonardo.",
    path: leanyouLeonardoSediPath(tenantSlug),
    noIndex: true,
  });
}

export default async function LeonardoSediPage({ params }: PageProps) {
  const { tenantSlug } = await params;
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

  const capabilities = getSessionLeonardoCapabilities(session);
  const venues = await listVenues(session.tenantId);

  return (
    <LeanYouShell session={session}>
      <Suspense fallback={<p className="text-sm text-white/50">Caricamento rubrica…</p>}>
        <LeonardoVenueListPageClient
          tenantSlug={tenantSlug}
          initialVenues={venues}
          clientiEnabled={capabilities.clienti}
        />
      </Suspense>
    </LeanYouShell>
  );
}
