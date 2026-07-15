import { notFound, redirect } from "next/navigation";

import { LeanYouShell } from "@/components/leanyou/LeanYouShell";
import { LeonardoRubricaNav } from "@/components/leanyou/LeonardoRubricaNav";
import { LEONARDO_PAGE_TITLE } from "@/components/leanyou/leonardo-ui";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/leanyou/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanyouLeonardoClientiPath,
  leanyouLeonardoPath,
  leanyouLoginPath,
} from "@/lib/leanyou/paths";
import { getSession } from "@/lib/leanyou/session";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug } = await params;

  return createPageMetadata({
    title: "LeanYou · Rubrica clienti",
    description: "Rubrica clienti Leonardo.",
    path: leanyouLeonardoClientiPath(tenantSlug),
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
    redirect(leanyouLoginPath());
  }
  if (
    !tenantHasModule(session, "events") ||
    !tenantHasLeonardoCapability(session, "clienti")
  ) {
    redirect(leanyouLeonardoPath(tenantSlug));
  }

  return (
    <LeanYouShell session={session}>
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
    </LeanYouShell>
  );
}
