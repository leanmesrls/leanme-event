import { redirect } from "next/navigation";

import { leanEventLeonardoPath } from "@/lib/lean-event/paths";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

/** Government rimosso dal catalogo moduli — redirect all'hub. */
export default async function LegacyGovernmentRedirect({ params }: PageProps) {
  const { tenantSlug } = await params;
  redirect(leanEventLeonardoPath(tenantSlug));
}
