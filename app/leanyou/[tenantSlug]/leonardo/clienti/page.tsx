import { notFound, redirect } from "next/navigation";

import { LeanEventShell } from "@/components/lean-event/LeanEventShell";
import { LeonardoPageHeader } from "@/components/lean-event/LeonardoPageHeader";
import { LeonardoRubricaNav } from "@/components/lean-event/LeonardoRubricaNav";
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
      <div className="space-y-4">
        <LeonardoPageHeader
          title="Rubrica clienti"
          subtitle="Anagrafica clienti e patrocinatori con comunicazioni strutturate. Sezione in preparazione — sarà collegata a contratti, eventi e thread email."
        />
        <LeonardoRubricaNav tenantSlug={tenantSlug} clientiEnabled />
      </div>
    </LeanEventShell>
  );
}
