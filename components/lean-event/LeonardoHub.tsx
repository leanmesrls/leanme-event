import Link from "next/link";

import { LeanAgentAiPoweredBy } from "@/components/lean-event/LeanAgentAiPoweredBy";
import { LeanEventUpgradeHint } from "@/components/lean-event/LeanEventUpgradeHint";
import { LeonardoPageHeader } from "@/components/lean-event/LeonardoPageHeader";
import {
  leanEventLeonardoContattiPath,
  leanEventLeonardoEventiPath,
  leanEventLeonardoFornitoriPath,
  leanEventLeonardoSediPath,
  leanEventLeonardoVerbaliPath,
} from "@/lib/lean-event/paths";
import type { TenantEvent, LeonardoWorkspace } from "@/types/lean-event";

interface LeonardoHubProps {
  tenantSlug: string;
  workspaces: LeonardoWorkspace[];
  events: TenantEvent[];
  contactCount: number;
  venueCount: number;
  supplierCount: number;
  fornitoriEnabled: boolean;
  verbaliEnabled: boolean;
  eventiEnabled: boolean;
}

export function LeonardoHub({
  tenantSlug,
  workspaces,
  events,
  contactCount,
  venueCount,
  supplierCount,
  verbaliEnabled,
  eventiEnabled,
  fornitoriEnabled,
}: LeonardoHubProps) {
  const completedVerbali = workspaces.filter(
    (workspace) => workspace.status === "completed"
  ).length;
  const activeEvents = events.filter((event) => event.status === "active").length;

  const cards = [
    {
      enabled: eventiEnabled,
      href: leanEventLeonardoEventiPath(tenantSlug),
      title: "Eventi",
      description: "Gestione congressi, ECM, logistica e comunicazioni.",
      stat: `${events.length} eventi · ${activeEvents} attivi`,
    },
    {
      enabled: eventiEnabled,
      href: leanEventLeonardoContattiPath(tenantSlug),
      title: "Rubrica",
      description: "Contatti, sedi, fornitori e clienti.",
      stat: `${contactCount} contatti · ${venueCount} sedi · ${supplierCount} fornitori`,
    },
    {
      enabled: verbaliEnabled,
      href: leanEventLeonardoVerbaliPath(tenantSlug),
      title: "Verbali AI",
      description: "Trascrizione e generazione verbali da audio e video.",
      stat: `${workspaces.length} workspace · ${completedVerbali} completati`,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <LeonardoPageHeader
          title="Overview"
          poweredBy={<LeanAgentAiPoweredBy agent="leonardo" />}
          subtitle="Piattaforma gestionale per eventi, anagrafiche e segreteria. Seleziona uno strumento dalla colonna sinistra o dalle schede sotto."
        />
        {eventiEnabled ? (
          <p className="mt-2 text-xs text-white/45">
            Rubrica:{" "}
            <Link href={leanEventLeonardoContattiPath(tenantSlug)} className="text-leanme-fuchsia hover:underline">
              Contatti
            </Link>
            {" · "}
            <Link href={leanEventLeonardoSediPath(tenantSlug)} className="text-leanme-fuchsia hover:underline">
              Sedi
            </Link>
            {fornitoriEnabled ? (
              <>
                {" · "}
                <Link href={leanEventLeonardoFornitoriPath(tenantSlug)} className="text-leanme-fuchsia hover:underline">
                  Fornitori
                </Link>
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) =>
          card.enabled ? (
            <Link
              key={card.title}
              href={card.href}
              className="rounded-xl border border-white/10 bg-[#111111] p-6 transition hover:border-leanme-fuchsia/40 hover:bg-[#141414]"
            >
              <h3 className="text-lg font-bold text-white">{card.title}</h3>
              <p className="mt-2 text-sm text-white/60">{card.description}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.1em] text-leanme-fuchsia">
                {card.stat}
              </p>
            </Link>
          ) : (
            <div
              key={card.title}
              className="rounded-xl border border-white/10 bg-[#0d0d0d] p-6 opacity-50"
            >
              <h3 className="text-lg font-bold text-white/70">{card.title}</h3>
              <p className="mt-2 text-sm text-white/45">{card.description}</p>
              <p className="mt-4">
                <LeanEventUpgradeHint />
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
