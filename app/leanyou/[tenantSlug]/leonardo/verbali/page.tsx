import { notFound, redirect } from "next/navigation";

import { LeanYouShell } from "@/components/leanyou/LeanYouShell";
import { LeonardoWorkspaceList } from "@/components/leanyou/LeonardoWorkspaceList";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/leanyou/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanyouLeonardoPath,
  leanyouLeonardoVerbaliPath,
  leanyouLoginPath,
} from "@/lib/leanyou/paths";
import { getSession } from "@/lib/leanyou/session";
import { listWorkspaces } from "@/lib/leanyou/workspaces";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug } = await params;

  return createPageMetadata({
    title: "LeanYou · Workspace verbali",
    description: "Generazione verbali Leonardo.",
    path: leanyouLeonardoVerbaliPath(tenantSlug),
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
    redirect(leanyouLoginPath());
  }
  if (
    !tenantHasModule(session, "leonardo") ||
    !tenantHasLeonardoCapability(session, "verbali")
  ) {
    redirect(leanyouLeonardoPath(tenantSlug));
  }

  const workspaces = await listWorkspaces(session.tenantId);

  return (
    <LeanYouShell session={session}>
      <LeonardoWorkspaceList
        tenantSlug={tenantSlug}
        initialWorkspaces={workspaces}
      />
    </LeanYouShell>
  );
}
