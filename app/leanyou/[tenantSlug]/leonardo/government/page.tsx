import { redirect } from "next/navigation";

import { LeanYouShell } from "@/components/leanyou/LeanYouShell";
import { findTenantBySlug, tenantHasLeonardoCapability } from "@/lib/leanyou/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanyouLeonardoGovernmentPath,
  leanyouLeonardoPath,
  leanyouLoginPath,
} from "@/lib/leanyou/paths";
import { getSession } from "@/lib/leanyou/session";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug } = await params;
  return createPageMetadata({
    title: "LeanYou · Government",
    description: "Gestione società scientifiche — modulo attivabile come servizio.",
    path: leanyouLeonardoGovernmentPath(tenantSlug),
    noIndex: true,
  });
}

export default async function LeonardoGovernmentPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const tenant = await findTenantBySlug(tenantSlug);
  if (!tenant) {
    redirect(leanyouLoginPath());
  }

  const session = await getSession();
  if (!session) {
    redirect(leanyouLoginPath());
  }
  if (!tenantHasLeonardoCapability(session, "government")) {
    redirect(leanyouLeonardoPath(tenantSlug));
  }

  return (
    <LeanYouShell session={session}>
      <div className="space-y-6 p-6 md:p-8">
        <div>
          <h2 className="text-2xl font-bold">Government</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            Moduli per la gestione delle società scientifiche — servizio
            attivabile separatamente. In roadmap.
          </p>
        </div>
      </div>
    </LeanYouShell>
  );
}
