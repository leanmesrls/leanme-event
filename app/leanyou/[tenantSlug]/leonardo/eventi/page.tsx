import { notFound, redirect } from "next/navigation";

import { LeanYouShell } from "@/components/leanyou/LeanYouShell";
import { LeonardoEventList } from "@/components/leanyou/LeonardoEventList";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/leanyou/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanyouLeonardoEventiPath,
  leanyouLeonardoPath,
  leanyouLoginPath,
} from "@/lib/leanyou/paths";
import { getSession } from "@/lib/leanyou/session";
import { listEvents } from "@/lib/leanyou/events";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug } = await params;

  return createPageMetadata({
    title: "LeanYou · Eventi",
    description: "Gestione eventi Leonardo.",
    path: leanyouLeonardoEventiPath(tenantSlug),
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
    redirect(leanyouLoginPath());
  }
  if (
    !tenantHasModule(session, "events") ||
    !tenantHasLeonardoCapability(session, "eventi")
  ) {
    redirect(leanyouLeonardoPath(tenantSlug));
  }

  const events = await listEvents(session.tenantId);

  return (
    <LeanYouShell session={session}>
      <LeonardoEventList tenantSlug={tenantSlug} initialEvents={events} />
    </LeanYouShell>
  );
}
