import { notFound, redirect } from "next/navigation";

import { LeonardoPageHeader } from "@/components/lean-event/LeonardoPageHeader";
import { findTenantBySlug } from "@/lib/lean-event/auth";
import { LEONARDO_UPGRADE_EMAIL } from "@/lib/lean-event/capabilities-core";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanEventLeonardoHelpCenterPath,
  leanEventLoginPath,
} from "@/lib/lean-event/paths";
import { getSession } from "@/lib/lean-event/session";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug } = await params;
  return createPageMetadata({
    title: "Lean Event · Help Center",
    description: "Helpdesk, mail e video tutorial LeanEvent.",
    path: leanEventLeonardoHelpCenterPath(tenantSlug),
    noIndex: true,
  });
}

export default async function LeonardoHelpCenterPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const tenant = await findTenantBySlug(tenantSlug);
  if (!tenant) {
    notFound();
  }

  const session = await getSession();
  if (!session) {
    redirect(leanEventLoginPath());
  }

  const supportMailto = `mailto:${LEONARDO_UPGRADE_EMAIL}?subject=${encodeURIComponent(
    "LeanEvent - Helpdesk / supporto"
  )}`;

  return (
    <div className="space-y-6">
      <LeonardoPageHeader
        title="Help Center"
        subtitle="Info e supporto quando Teresa non basta: helpdesk via mail e video tutorial."
      />

      <section className="rounded-xl border border-white/10 bg-[#111111] p-6 space-y-4">
        <p className="text-sm text-white/65">
          Per domande operative, anomalie o formazione del team, contatta il
          nostro helpdesk. I video tutorial saranno raccolti qui.
        </p>
        <a
          href={supportMailto}
          className="inline-flex rounded-full bg-leanme-fuchsia px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark"
        >
          Scrivi al helpdesk
        </a>
        <div className="rounded-lg border border-dashed border-white/15 px-4 py-6 text-center text-sm text-white/40">
          Area video tutorial in arrivo.
        </div>
      </section>
    </div>
  );
}
