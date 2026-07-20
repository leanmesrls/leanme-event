import { redirect } from "next/navigation";

import { LeanAgentAiPoweredBy } from "@/components/lean-event/LeanAgentAiPoweredBy";
import {
  LeonardoPageHeader,
  LEONARDO_PAGE_ACTION_BUTTON,
} from "@/components/lean-event/LeonardoPageHeader";
import { LeonardoTeresaSupervisePanel } from "@/components/lean-event/LeonardoTeresaSupervisePanel";
import {
  findTenantBySlug,
  isLeanMePlatformOperator,
  tenantHasLeonardoCapability,
} from "@/lib/lean-event/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanEventLeonardoLeanHumanPath,
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
    title: "LeanEvent · Lean.Human",
    description:
      "Supporto umano LeanMe — assistenza, integrazioni e supervisione Teresa.",
    path: leanEventLeonardoLeanHumanPath(tenantSlug),
    noIndex: true,
  });
}

export default async function LeonardoLeanHumanPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const tenant = await findTenantBySlug(tenantSlug);
  if (!tenant) {
    redirect(leanEventLoginPath());
  }

  const session = await getSession();
  if (!session) {
    redirect(leanEventLoginPath());
  }

  const isPlatformOp = isLeanMePlatformOperator(session);
  const hasLeanHuman = tenantHasLeonardoCapability(session, "lean_human");

  if (!isPlatformOp && !hasLeanHuman) {
    redirect(leanEventLeonardoPath(tenantSlug));
  }

  if (isPlatformOp) {
    return (
      <LeonardoTeresaSupervisePanel />
    );
  }

  return (
      <div className="space-y-4">
        <LeonardoPageHeader
          title="Lean.Human"
          poweredBy={<LeanAgentAiPoweredBy agent="teresa" />}
          subtitle="Il team LeanMe al tuo fianco — assistenza, integrazioni e intervento manuale quando serve una persona in più."
          action={
            <a
              href="mailto:info@leanme.it?subject=LeanEvent%20-%20Lean.Human%20richiesta%20supporto"
              className={LEONARDO_PAGE_ACTION_BUTTON}
            >
              Richiedi supporto
            </a>
          }
        />
        <p className="max-w-2xl text-sm text-white/55">
          Per ora Lean.Human è il canale di contatto con LeanMe. Scrivici pure
          per supporto operativo, integrazioni o interventi manuali sul
          workspace.
        </p>
      </div>
    );
}
