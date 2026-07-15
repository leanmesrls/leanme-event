import { redirect } from "next/navigation";

import { LeanYouShell } from "@/components/leanyou/LeanYouShell";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
} from "@/lib/leanyou/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanyouLeonardoFinancePath,
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
    title: "LeanYou · Finance",
    description: "Report economico aggregato di tutti gli eventi.",
    path: leanyouLeonardoFinancePath(tenantSlug),
    noIndex: true,
  });
}

export default async function LeonardoFinancePage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const tenant = await findTenantBySlug(tenantSlug);
  if (!tenant) {
    redirect(leanyouLoginPath());
  }

  const session = await getSession();
  if (!session) {
    redirect(leanyouLoginPath());
  }
  if (!tenantHasLeonardoCapability(session, "finance")) {
    redirect(leanyouLeonardoPath(tenantSlug));
  }

  return (
    <LeanYouShell session={session}>
      <div className="space-y-6 p-6 md:p-8">
        <div>
          <h2 className="text-2xl font-bold">Finance</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            Report aggregato dei budget di tutti gli eventi — andamento economico
            dell&apos;agenzia. In arrivo nello Sprint 3.
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-white/15 bg-[#111111] p-8 text-center text-sm text-white/45">
          Nessun dato budget ancora consolidato. I budget per evento saranno
          configurabili dalla scheda di ciascun evento.
        </div>
      </div>
    </LeanYouShell>
  );
}
