import { notFound, redirect } from "next/navigation";

import { LeonardoWorkspaceForm } from "@/components/lean-event/LeonardoWorkspaceForm";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanEventLeonardoNewPath,
  leanEventLeonardoPath,
  leanEventLoginPath,
} from "@/lib/lean-event/paths";
import { getSession } from "@/lib/lean-event/session";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ eventId?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug } = await params;

  return createPageMetadata({
    title: "Lean Event · Nuovo workspace verbale",
    description: "Crea un nuovo workspace verbali.",
    path: leanEventLeonardoNewPath(tenantSlug),
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
    redirect(leanEventLoginPath());
  }
  if (
    !tenantHasModule(session, "leonardo") ||
    !tenantHasLeonardoCapability(session, "verbali")
  ) {
    redirect(leanEventLeonardoPath(tenantSlug));
  }

  return (
      <LeonardoWorkspaceForm tenantSlug={tenantSlug} linkedEventId={eventId} />
    );
}
