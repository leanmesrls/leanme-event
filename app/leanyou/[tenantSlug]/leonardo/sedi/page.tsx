import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import { LeanEventShell } from "@/components/lean-event/LeanEventShell";
import { LeonardoVenueListPageClient } from "@/components/lean-event/LeonardoVenueListPageClient";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import { getSessionLeonardoCapabilities } from "@/lib/lean-event/capabilities";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanEventLeonardoPath,
  leanEventLeonardoSediPath,
  leanEventLoginPath,
} from "@/lib/lean-event/paths";
import { getSession } from "@/lib/lean-event/session";
import { listVenues } from "@/lib/lean-event/venues";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug } = await params;

  return createPageMetadata({
    title: "Lean Event · Rubrica sedi",
    description: "Rubrica sedi Leonardo.",
    path: leanEventLeonardoSediPath(tenantSlug),
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
    redirect(leanEventLoginPath());
  }
  if (
    !tenantHasModule(session, "events") ||
    !tenantHasLeonardoCapability(session, "eventi")
  ) {
    redirect(leanEventLeonardoPath(tenantSlug));
  }

  const capabilities = getSessionLeonardoCapabilities(session);
  const venues = await listVenues(session.tenantId);

  return (
    <LeanEventShell session={session}>
      <Suspense fallback={<p className="text-sm text-white/50">Caricamento rubrica…</p>}>
        <LeonardoVenueListPageClient
          tenantSlug={tenantSlug}
          initialVenues={venues}
          clientiEnabled={capabilities.clienti}
        />
      </Suspense>
    </LeanEventShell>
  );
}
