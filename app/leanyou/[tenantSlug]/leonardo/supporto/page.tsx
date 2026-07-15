import { redirect } from "next/navigation";

import { leanyouLeonardoLeanHumanPath } from "@/lib/leanyou/paths";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function LegacyLeonardoSupportoRedirect({
  params,
}: PageProps) {
  const { tenantSlug } = await params;
  redirect(leanyouLeonardoLeanHumanPath(tenantSlug));
}
