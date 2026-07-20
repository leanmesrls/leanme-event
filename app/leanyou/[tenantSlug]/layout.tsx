import { notFound, redirect } from "next/navigation";

import { LeanEventShell } from "@/components/lean-event/LeanEventShell";
import { findTenantBySlug } from "@/lib/lean-event/auth";
import { leanEventLoginPath } from "@/lib/lean-event/paths";
import { getSession } from "@/lib/lean-event/session";

export const dynamic = "force-dynamic";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}

/**
 * Shell unico per tutto il tenant — resta montato tra Eventi / Contatti / …
 * così tab ed elenchi keep-alive non si perdono al cambio sezione.
 */
export default async function LeanEventTenantLayout({
  children,
  params,
}: LayoutProps) {
  const { tenantSlug } = await params;
  const tenant = await findTenantBySlug(tenantSlug);
  if (!tenant) {
    notFound();
  }

  const session = await getSession();
  if (!session) {
    redirect(leanEventLoginPath());
  }
  if (session.tenantSlug !== tenantSlug) {
    redirect(leanEventLoginPath());
  }

  return <LeanEventShell session={session}>{children}</LeanEventShell>;
}
