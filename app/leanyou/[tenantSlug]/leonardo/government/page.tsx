import { redirect } from "next/navigation";

import { LeanEventShell } from "@/components/lean-event/LeanEventShell";
import { findTenantBySlug, tenantHasLeonardoCapability } from "@/lib/lean-event/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanEventLeonardoGovernmentPath,
  leanEventLeonardoPath,
  leanEventLoginPath,
} from "@/lib/lean-event/paths";
import { getSession } from "@/lib/lean-event/session";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug } = await params;
  return createPageMetadata({
    title: "Lean Event · Government",
    description: "Gestione società scientifiche — modulo attivabile come servizio.",
    path: leanEventLeonardoGovernmentPath(tenantSlug),
    noIndex: true,
  });
}

export default async function LeonardoGovernmentPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const tenant = await findTenantBySlug(tenantSlug);
  if (!tenant) {
    redirect(leanEventLoginPath());
  }

  const session = await getSession();
  if (!session) {
    redirect(leanEventLoginPath());
  }
  if (!tenantHasLeonardoCapability(session, "government")) {
    redirect(leanEventLeonardoPath(tenantSlug));
  }

  return (
    <LeanEventShell session={session}>
      <div className="space-y-6 p-6 md:p-8">
        <div>
          <h2 className="text-2xl font-bold">Government</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            Moduli per la gestione delle società scientifiche — servizio
            attivabile separatamente. In roadmap.
          </p>
        </div>
      </div>
    </LeanEventShell>
  );
}
