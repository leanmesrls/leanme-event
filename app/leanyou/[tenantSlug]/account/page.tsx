import { notFound, redirect } from "next/navigation";

import { LeonardoPageHeader } from "@/components/lean-event/LeonardoPageHeader";
import { findTenantBySlug } from "@/lib/lean-event/auth";
import { LEONARDO_UPGRADE_EMAIL } from "@/lib/lean-event/capabilities-core";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanEventLeonardoAccountPath,
  leanEventLoginPath,
} from "@/lib/lean-event/paths";
import { getSession } from "@/lib/lean-event/session";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug } = await params;
  return createPageMetadata({
    title: "Lean Event · Account",
    description: "Gestione pacchetto e upgrade LeanEvent.",
    path: leanEventLeonardoAccountPath(tenantSlug),
    noIndex: true,
  });
}

export default async function LeonardoAccountPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const tenant = await findTenantBySlug(tenantSlug);
  if (!tenant) {
    notFound();
  }

  const session = await getSession();
  if (!session) {
    redirect(leanEventLoginPath());
  }

  const upgradeMailto = `mailto:${LEONARDO_UPGRADE_EMAIL}?subject=${encodeURIComponent(
    "LeanEvent - Richiesta upgrade pacchetto"
  )}`;
  const downgradeMailto = `mailto:${LEONARDO_UPGRADE_EMAIL}?subject=${encodeURIComponent(
    "LeanEvent - Richiesta downgrade pacchetto"
  )}`;

  return (
    <div className="space-y-6">
      <LeonardoPageHeader
        title="Account"
        subtitle="Pacchetto attivo, upgrade/downgrade e opzioni Enterprise (white label)."
      />

      <section className="rounded-xl border border-white/10 bg-[#111111] p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-leanme-fuchsia">
          Pacchetti
        </h3>
        <ul className="space-y-2 text-sm text-white/65">
          <li>
            <span className="text-white/85">Starter</span> — Eventi, Rubrica,
            Finance, Documenti
          </li>
          <li>
            <span className="text-white/85">Pro</span> — Forms, Engagements,
            Comunicazioni, Web
          </li>
          <li>
            <span className="text-white/85">Intelligence</span> — Verbali AI,
            Writer AI, Designer AI, Traduzioni AI
          </li>
          <li>
            <span className="text-white/85">Enterprise</span> — tutto + white
            label
          </li>
        </ul>
        <p className="text-xs text-white/40">
          Dettagli di fatturazione e cambio piano: a breve in questa pagina. Per
          ora puoi richiedere upgrade o downgrade al team LeanMe.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href={upgradeMailto}
            className="rounded-full bg-leanme-fuchsia px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark"
          >
            Richiedi upgrade
          </a>
          <a
            href={downgradeMailto}
            className="rounded-full border border-white/20 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white/80 transition hover:border-white hover:text-white"
          >
            Richiedi downgrade
          </a>
        </div>
      </section>
    </div>
  );
}
