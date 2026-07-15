import { notFound, redirect } from "next/navigation";

import { LeanYouShell } from "@/components/leanyou/LeanYouShell";
import { LeonardoEventForm } from "@/components/leanyou/LeonardoEventForm";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/leanyou/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanyouLeonardoEventNewPath,
  leanyouLeonardoPath,
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
    title: "LeanYou · Nuovo evento",
    description: "Crea un nuovo evento.",
    path: leanyouLeonardoEventNewPath(tenantSlug),
    noIndex: true,
  });
}

export default async function LeonardoEventiNewPage({ params }: PageProps) {
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

  const venues = await listVenues(session.tenantId);

  return (
    <LeanYouShell session={session}>
      <LeonardoEventForm tenantSlug={tenantSlug} venues={venues} />
    </LeanYouShell>
  );
}
