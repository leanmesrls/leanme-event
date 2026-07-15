import { notFound, redirect } from "next/navigation";

import { findTenantBySlug } from "@/lib/lean-event/auth";
import { leanEventLeonardoPath } from "@/lib/lean-event/paths";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function LeanEventTenantHomePage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const tenant = await findTenantBySlug(tenantSlug);
  if (!tenant) {
    notFound();
  }

  redirect(leanEventLeonardoPath(tenantSlug));
}
