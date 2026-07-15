import { redirect } from "next/navigation";

import { LeanYouShell } from "@/components/leanyou/LeanYouShell";
import { findTenantBySlug, tenantHasLeonardoCapability } from "@/lib/leanyou/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanyouLeonardoLeanHumanPath,
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
    title: "LeanYou · Lean.Human",
    description: "Supporto umano LeanMe — assistenza, integrazioni e produzione.",
    path: leanyouLeonardoLeanHumanPath(tenantSlug),
    noIndex: true,
  });
}

export default async function LeonardoLeanHumanPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const tenant = await findTenantBySlug(tenantSlug);
  if (!tenant) {
    redirect(leanyouLoginPath());
  }

  const session = await getSession();
  if (!session) {
    redirect(leanyouLoginPath());
  }
  if (!tenantHasLeonardoCapability(session, "lean_human")) {
    redirect(leanyouLeonardoPath(tenantSlug));
  }

  return (
    <LeanYouShell session={session}>
      <div className="mx-auto max-w-2xl space-y-6 p-6 md:p-8">
        <div>
          <h2 className="text-2xl font-bold">Lean.Human</h2>
          <p className="mt-1 text-sm text-white/60">
            Il team LeanMe al tuo fianco — assistenza, integrazioni e intervento
            manuale quando serve una persona in più.
          </p>
        </div>
        <a
          href="mailto:info@leanme.it?subject=LeanYou%20-%20Lean.Human%20richiesta%20supporto"
          className="inline-flex rounded-full bg-leanme-fuchsia px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark"
        >
          Richiedi supporto
        </a>
      </div>
    </LeanYouShell>
  );
}
