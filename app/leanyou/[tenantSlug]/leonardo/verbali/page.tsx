import { notFound, redirect } from "next/navigation";

import { LeanEventShell } from "@/components/lean-event/LeanEventShell";
import { LeonardoWorkspaceList } from "@/components/lean-event/LeonardoWorkspaceList";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanEventLeonardoPath,
  leanEventLeonardoVerbaliPath,
  leanEventLoginPath,
} from "@/lib/lean-event/paths";
import { getSession } from "@/lib/lean-event/session";
import { listWorkspaces } from "@/lib/lean-event/workspaces";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug } = await params;

  return createPageMetadata({
    title: "Lean Event · Workspace verbali",
    description: "Generazione verbali Leonardo.",
    path: leanEventLeonardoVerbaliPath(tenantSlug),
    noIndex: true,
  });
}

export default async function LeonardoVerbaliIndexPage({ params }: PageProps) {
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
    !tenantHasModule(session, "leonardo") ||
    !tenantHasLeonardoCapability(session, "verbali")
  ) {
    redirect(leanEventLeonardoPath(tenantSlug));
  }

  const workspaces = await listWorkspaces(session.tenantId);

  return (
    <LeanEventShell session={session}>
      <LeonardoWorkspaceList
        tenantSlug={tenantSlug}
        initialWorkspaces={workspaces}
      />
    </LeanEventShell>
  );
}
