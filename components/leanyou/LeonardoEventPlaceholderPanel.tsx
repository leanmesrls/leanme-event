"use client";

import { LeanAgentAiPoweredBy } from "@/components/leanyou/LeanAgentAiPoweredBy";
import type { EventNavTab } from "@/lib/leanyou/event-nav";

interface LeonardoEventPlaceholderPanelProps {
  tab: Pick<
    EventNavTab,
    "placeholderTitle" | "placeholderDescription" | "aiCapability"
  >;
}

export function LeonardoEventPlaceholderPanel({
  tab,
}: LeonardoEventPlaceholderPanelProps) {
  return (
    <section className="rounded-xl border border-dashed border-white/20 bg-[#111111] p-6">
      <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-leanme-fuchsia">
        {tab.placeholderTitle ?? "In arrivo"}
      </h3>
      <p className="mt-3 max-w-2xl text-sm text-white/60">
        {tab.placeholderDescription ??
          "Sezione pianificata nella roadmap Leonardo. La struttura di navigazione è già pronta."}
      </p>
      <LeanAgentAiPoweredBy
        capability={tab.aiCapability ?? "ai_assistant"}
        className="mt-4"
      />
      <p className="mt-4 text-xs text-white/40">
        Fase navigazione configurata — implementazione funzionale prossima release.
      </p>
    </section>
  );
}
