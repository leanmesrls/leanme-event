import Link from "next/link";

import { LeanYouUpgradeHint } from "@/components/leanyou/LeanYouUpgradeHint";
import {
  leanyouLeonardoContattiPath,
  leanyouLeonardoEventiPath,
  leanyouLeonardoFornitoriPath,
  leanyouLeonardoSediPath,
  leanyouLeonardoVerbaliPath,
} from "@/lib/leanyou/paths";
import type { LeonardoEvent, LeonardoWorkspace } from "@/types/leanyou";

interface LeonardoHubProps {
  tenantSlug: string;
  workspaces: LeonardoWorkspace[];
  events: LeonardoEvent[];
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
      href: leanyouLeonardoEventiPath(tenantSlug),
      title: "Eventi",
      description: "Gestione congressi, ECM, logistica e comunicazioni.",
      stat: `${events.length} eventi · ${activeEvents} attivi`,
    },
    {
      enabled: eventiEnabled,
      href: leanyouLeonardoContattiPath(tenantSlug),
      title: "Rubrica",
      description: "Contatti, sedi, fornitori e clienti.",
      stat: `${contactCount} contatti · ${venueCount} sedi · ${supplierCount} fornitori`,
    },
    {
      enabled: verbaliEnabled,
      href: leanyouLeonardoVerbaliPath(tenantSlug),
      title: "Verbali AI",
      description: "Trascrizione e generazione verbali da audio e video.",
      stat: `${workspaces.length} workspace · ${completedVerbali} completati`,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-[0.04em]">Cruscotto Leonardo</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/60">
          Piattaforma gestionale per eventi, anagrafiche e segreteria. Seleziona
          uno strumento dalla colonna sinistra o dalle schede sotto.
        </p>
        {eventiEnabled ? (
          <p className="mt-2 text-xs text-white/45">
            Rubrica:{" "}
            <Link href={leanyouLeonardoContattiPath(tenantSlug)} className="text-leanme-fuchsia hover:underline">
              Contatti
            </Link>
            {" · "}
            <Link href={leanyouLeonardoSediPath(tenantSlug)} className="text-leanme-fuchsia hover:underline">
              Sedi
            </Link>
            {fornitoriEnabled ? (
              <>
                {" · "}
                <Link href={leanyouLeonardoFornitoriPath(tenantSlug)} className="text-leanme-fuchsia hover:underline">
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
                <LeanYouUpgradeHint />
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
