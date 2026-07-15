import { redirect } from "next/navigation";

import { LeanEventShell } from "@/components/lean-event/LeanEventShell";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
} from "@/lib/lean-event/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanEventLeonardoFinancePath,
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
    title: "Lean Event · Finance",
    description: "Report economico aggregato di tutti gli eventi.",
    path: leanEventLeonardoFinancePath(tenantSlug),
    noIndex: true,
  });
}

export default async function LeonardoFinancePage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const tenant = await findTenantBySlug(tenantSlug);
  if (!tenant) {
    redirect(leanEventLoginPath());
  }

  const session = await getSession();
  if (!session) {
    redirect(leanEventLoginPath());
  }
  if (!tenantHasLeonardoCapability(session, "finance")) {
    redirect(leanEventLeonardoPath(tenantSlug));
  }

  return (
    <LeanEventShell session={session}>
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
    </LeanEventShell>
  );
}
