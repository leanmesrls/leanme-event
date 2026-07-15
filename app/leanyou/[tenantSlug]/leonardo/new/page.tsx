import { redirect } from "next/navigation";

import { leanyouLeonardoNewPath } from "@/lib/leanyou/paths";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function LeonardoLegacyNewRedirect({ params }: PageProps) {
  const { tenantSlug } = await params;
  redirect(leanyouLeonardoNewPath(tenantSlug));
}
