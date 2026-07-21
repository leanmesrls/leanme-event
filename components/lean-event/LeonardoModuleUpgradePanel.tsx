"use client";

import { LeanEventUpgradeHint } from "@/components/lean-event/LeanEventUpgradeHint";
import { leonardoUpgradeMailto } from "@/lib/lean-event/capabilities";

interface LeonardoModuleUpgradePanelProps {
  moduleLabel: string;
  description?: string;
}

export function LeonardoModuleUpgradePanel({
  moduleLabel,
  description,
}: LeonardoModuleUpgradePanelProps) {
  return (
    <section className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-6">
      <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-amber-100">
        {moduleLabel} — upgrade richiesto
      </h3>
      <p className="mt-3 text-sm text-white/70">
        {description ??
          "Questo modulo non è incluso nel pacchetto attivo del tenant. Per usarlo in modo standalone o collegato all'evento, richiedi l'upgrade."}
      </p>
      <LeanEventUpgradeHint className="mt-4" />
      <a
        href={leonardoUpgradeMailto(`LeanEvent - Upgrade ${moduleLabel}`)}
        className="mt-5 inline-flex rounded-full bg-leanme-fuchsia px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark"
      >
        Richiedi upgrade
      </a>
    </section>
  );
}
