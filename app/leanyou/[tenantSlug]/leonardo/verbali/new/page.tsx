import { notFound, redirect } from "next/navigation";

import { LeanYouShell } from "@/components/leanyou/LeanYouShell";
import { LeonardoWorkspaceForm } from "@/components/leanyou/LeonardoWorkspaceForm";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/leanyou/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanyouLeonardoNewPath,
  leanyouLeonardoPath,
  leanyouLoginPath,
} from "@/lib/leanyou/paths";
import { getSession } from "@/lib/leanyou/session";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ eventId?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug } = await params;

  return createPageMetadata({
    title: "LeanYou · Nuovo workspace verbale",
    description: "Crea un nuovo workspace verbali.",
    path: leanyouLeonardoNewPath(tenantSlug),
    noIndex: true,
  });
}

export default async function LeonardoVerbaliNewPage({
  params,
  searchParams,
}: PageProps) {
  const { tenantSlug } = await params;
  const { eventId } = await searchParams;
  const tenant = await findTenantBySlug(tenantSlug);
  if (!tenant) {
    notFound();
  }

  const session = await getSession();
  if (!session) {
    redirect(leanyouLoginPath());
  }
  if (
    !tenantHasModule(session, "leonardo") ||
    !tenantHasLeonardoCapability(session, "verbali")
  ) {
    redirect(leanyouLeonardoPath(tenantSlug));
  }

  return (
    <LeanYouShell session={session}>
      <LeonardoWorkspaceForm tenantSlug={tenantSlug} linkedEventId={eventId} />
    </LeanYouShell>
  );
}
