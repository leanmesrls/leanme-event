import { notFound, redirect } from "next/navigation";

import { LeonardoEventForm } from "@/components/lean-event/LeonardoEventForm";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanEventLeonardoEventNewPath,
  leanEventLeonardoPath,
  leanEventLoginPath,
} from "@/lib/lean-event/paths";
import { getSession } from "@/lib/lean-event/session";
import { listVenues } from "@/lib/lean-event/venues";
import { listPublicTenantUsersByTenantId } from "@/lib/lean-event/tenant-users";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug } = await params;

  return createPageMetadata({
    title: "Lean Event · Nuovo evento",
    description: "Crea un nuovo evento.",
    path: leanEventLeonardoEventNewPath(tenantSlug),
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
    redirect(leanEventLoginPath());
  }
  if (
    !tenantHasModule(session, "events") ||
    !tenantHasLeonardoCapability(session, "eventi")
  ) {
    redirect(leanEventLeonardoPath(tenantSlug));
  }

  const venues = await listVenues(session.tenantId);
  const tenantUsers = await listPublicTenantUsersByTenantId(session.tenantId);

  return (
      <LeonardoEventForm
        tenantSlug={tenantSlug}
        venues={venues}
        tenantUsers={tenantUsers}
      />
    );
}
