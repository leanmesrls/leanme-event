import { notFound, redirect } from "next/navigation";

import { findTenantBySlug } from "@/lib/leanyou/auth";
import { leanyouLeonardoPath } from "@/lib/leanyou/paths";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function LeanYouTenantHomePage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const tenant = await findTenantBySlug(tenantSlug);
  if (!tenant) {
    notFound();
  }

  redirect(leanyouLeonardoPath(tenantSlug));
}
