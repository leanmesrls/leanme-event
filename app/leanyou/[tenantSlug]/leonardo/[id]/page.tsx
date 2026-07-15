import { notFound, redirect } from "next/navigation";

import {
  isLeonardoWorkspaceId,
  leanEventLeonardoWorkspacePath,
} from "@/lib/lean-event/paths";

interface PageProps {
  params: Promise<{ tenantSlug: string; id: string }>;
}

export default async function LeonardoLegacyWorkspaceRedirect({
  params,
}: PageProps) {
  const { tenantSlug, id } = await params;

  if (isLeonardoWorkspaceId(id)) {
    redirect(leanEventLeonardoWorkspacePath(tenantSlug, id));
  }

  notFound();
}
