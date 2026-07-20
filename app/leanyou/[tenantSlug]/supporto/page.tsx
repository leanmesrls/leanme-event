import { redirect } from "next/navigation";

import { leanEventLeonardoLeanHumanPath } from "@/lib/lean-event/paths";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function LegacyLeonardoSupportoRedirect({
  params,
}: PageProps) {
  const { tenantSlug } = await params;
  redirect(leanEventLeonardoLeanHumanPath(tenantSlug));
}
