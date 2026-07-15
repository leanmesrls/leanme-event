import { notFound, redirect } from "next/navigation";

import { LeanYouShell } from "@/components/leanyou/LeanYouShell";
import { LeonardoWorkspaceDetail } from "@/components/leanyou/LeonardoWorkspaceDetail";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/leanyou/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanyouLeonardoPath,
  leanyouLeonardoVerbaliPath,
  leanyouLeonardoWorkspacePath,
  leanyouLoginPath,
} from "@/lib/leanyou/paths";
import { getSession } from "@/lib/leanyou/session";
import { listEvents } from "@/lib/leanyou/events";
import { getWorkspace } from "@/lib/leanyou/workspaces";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ tenantSlug: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug, id } = await params;

  return createPageMetadata({
    title: `LeanYou · Workspace ${id.slice(0, 8)}`,
    description: "Dettaglio workspace verbali.",
    path: leanyouLeonardoWorkspacePath(tenantSlug, id),
    noIndex: true,
  });
}

export default async function LeonardoVerbaliWorkspacePage({ params }: PageProps) {
  const { tenantSlug, id } = await params;
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

  const workspace = await getWorkspace(session.tenantId, id);
  if (!workspace) {
    redirect(`${leanyouLeonardoVerbaliPath(tenantSlug)}?workspace=missing`);
  }

  const events = tenantHasLeonardoCapability(session, "eventi")
    ? await listEvents(session.tenantId)
    : [];

  return (
    <LeanYouShell session={session}>
      <LeonardoWorkspaceDetail
        tenantSlug={tenantSlug}
        initialWorkspace={workspace}
        events={events}
      />
    </LeanYouShell>
  );
}
