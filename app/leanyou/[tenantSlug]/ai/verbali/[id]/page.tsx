import { notFound, redirect } from "next/navigation";

import { LeonardoWorkspaceDetail } from "@/components/lean-event/LeonardoWorkspaceDetail";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanEventLeonardoPath,
  leanEventLeonardoVerbaliPath,
  leanEventLeonardoWorkspacePath,
  leanEventLoginPath,
} from "@/lib/lean-event/paths";
import { getSession } from "@/lib/lean-event/session";
import { listEvents } from "@/lib/lean-event/events";
import { getWorkspace } from "@/lib/lean-event/workspaces";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ tenantSlug: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug, id } = await params;

  return createPageMetadata({
    title: `Lean Event · Workspace ${id.slice(0, 8)}`,
    description: "Dettaglio workspace verbali.",
    path: leanEventLeonardoWorkspacePath(tenantSlug, id),
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
    redirect(leanEventLoginPath());
  }
  if (
    !tenantHasModule(session, "leonardo") ||
    !tenantHasLeonardoCapability(session, "verbali")
  ) {
    redirect(leanEventLeonardoPath(tenantSlug));
  }

  const workspace = await getWorkspace(session.tenantId, id);
  if (!workspace) {
    redirect(`${leanEventLeonardoVerbaliPath(tenantSlug)}?workspace=missing`);
  }

  const events = tenantHasLeonardoCapability(session, "eventi")
    ? await listEvents(session.tenantId)
    : [];

  return (
      <LeonardoWorkspaceDetail
        tenantSlug={tenantSlug}
        initialWorkspace={workspace}
        events={events}
      />
    );
}
