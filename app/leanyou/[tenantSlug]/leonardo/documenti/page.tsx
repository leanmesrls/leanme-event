import { notFound, redirect } from "next/navigation";

import { LeanEventShell } from "@/components/lean-event/LeanEventShell";
import { LeonardoDocumentsPanel } from "@/components/lean-event/LeonardoDocumentsPanel";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanEventLeonardoDocumentiPath,
  leanEventLeonardoPath,
  leanEventLoginPath,
} from "@/lib/lean-event/paths";
import { getSession } from "@/lib/lean-event/session";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug } = await params;

  return createPageMetadata({
    title: "Lean Event · Documenti",
    description: "Registry documenti Leonardo (CV, attestati, pack).",
    path: leanEventLeonardoDocumentiPath(tenantSlug),
    noIndex: true,
  });
}

export default async function LeonardoDocumentiPage({ params }: PageProps) {
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
    !(
      tenantHasLeonardoCapability(session, "eventi") ||
      tenantHasLeonardoCapability(session, "contatti") ||
      tenantHasLeonardoCapability(session, "fornitori")
    )
  ) {
    redirect(leanEventLeonardoPath(tenantSlug));
  }

  return (
    <LeanEventShell session={session}>
      <LeonardoDocumentsPanel tenantSlug={tenantSlug} />
    </LeanEventShell>
  );
}
