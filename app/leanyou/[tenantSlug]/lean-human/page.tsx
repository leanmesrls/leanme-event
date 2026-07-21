import { redirect } from "next/navigation";

import { leanEventLeonardoLeanStudioPath } from "@/lib/lean-event/paths";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

/** Redirect legacy Lean.Human → Lean.Studio */
export default async function LegacyLeanHumanRedirect({ params }: PageProps) {
  const { tenantSlug } = await params;
  redirect(leanEventLeonardoLeanStudioPath(tenantSlug));
}
