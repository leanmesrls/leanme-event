import { redirect } from "next/navigation";

import { leanEventLeonardoNewPath } from "@/lib/lean-event/paths";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function LeonardoLegacyNewRedirect({ params }: PageProps) {
  const { tenantSlug } = await params;
  redirect(leanEventLeonardoNewPath(tenantSlug));
}
