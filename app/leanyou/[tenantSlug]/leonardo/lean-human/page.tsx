import { redirect } from "next/navigation";

import { LeanEventShell } from "@/components/lean-event/LeanEventShell";
import {
  LeonardoPageHeader,
  LEONARDO_PAGE_ACTION_BUTTON,
} from "@/components/lean-event/LeonardoPageHeader";
import { findTenantBySlug, tenantHasLeonardoCapability } from "@/lib/lean-event/auth";
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
    title: "Lean Event · Lean.Human",
    description: "Supporto umano LeanMe — assistenza, integrazioni e produzione.",
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
  if (!tenantHasLeonardoCapability(session, "lean_human")) {
    redirect(leanEventLeonardoPath(tenantSlug));
  }

  return (
    <LeanEventShell session={session}>
      <div className="space-y-4">
        <LeonardoPageHeader
          title="Lean.Human"
          subtitle="Il team LeanMe al tuo fianco — assistenza, integrazioni e intervento manuale quando serve una persona in più."
          action={
            <a
              href="mailto:info@leanme.it?subject=Lean Event%20-%20Lean.Human%20richiesta%20supporto"
              className={LEONARDO_PAGE_ACTION_BUTTON}
            >
              Richiedi supporto
            </a>
          }
        />
      </div>
    </LeanEventShell>
  );
}
