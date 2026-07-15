import { notFound, redirect } from "next/navigation";

import { LeanEventShell } from "@/components/lean-event/LeanEventShell";
import { LeonardoRubricaNav } from "@/components/lean-event/LeonardoRubricaNav";
import { LEONARDO_PAGE_TITLE } from "@/components/lean-event/leonardo-ui";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanEventLeonardoClientiPath,
  leanEventLeonardoPath,
  leanEventLoginPath,
} from "@/lib/lean-event/paths";
import { getSession } from "@/lib/lean-event/session";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug } = await params;

  return createPageMetadata({
    title: "Lean Event · Rubrica clienti",
    description: "Rubrica clienti Leonardo.",
    path: leanEventLeonardoClientiPath(tenantSlug),
    noIndex: true,
  });
}

export default async function LeonardoClientiPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const tenant = await findTenantBySlug(tenantSlug);
  if (!tenant) {
    notFound();
  }

  const session = await getSession();
  if (!session) {
    redirect(leanEventLoginPath());
  }
  if (
    !tenantHasModule(session, "events") ||
    !tenantHasLeonardoCapability(session, "clienti")
  ) {
    redirect(leanEventLeonardoPath(tenantSlug));
  }

  return (
    <LeanEventShell session={session}>
      <div className="space-y-6">
        <LeonardoRubricaNav tenantSlug={tenantSlug} clientiEnabled />
        <div className="rounded-xl border border-white/10 bg-[#111111] p-8">
          <h2 className={LEONARDO_PAGE_TITLE}>Rubrica clienti</h2>
          <p className="mt-3 max-w-2xl text-sm text-white/60">
            Anagrafica clienti e patrocinatori con comunicazioni strutturate. Sezione
            in preparazione — sarà collegata a contratti, eventi e thread email.
          </p>
        </div>
      </div>
    </LeanEventShell>
  );
}
