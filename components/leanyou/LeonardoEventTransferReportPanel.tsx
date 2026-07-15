"use client";

import { useMemo } from "react";

import type { EventAssignmentWithContact } from "@/lib/leanyou/event-assignments";
import {
  buildLogisticsTransferSuggestions,
  downloadTransferSuggestionsCsv,
} from "@/lib/leanyou/event-logistics";
import type { LeonardoEvent } from "@/types/leanyou";

interface LeonardoEventTransferReportPanelProps {
  event: LeonardoEvent;
  assignments: EventAssignmentWithContact[];
}

export function LeonardoEventTransferReportPanel({
  event,
  assignments,
}: LeonardoEventTransferReportPanelProps) {
  const suggestions = useMemo(
    () => buildLogisticsTransferSuggestions(assignments),
    [assignments]
  );

  return (
    <section className="space-y-4 rounded-xl border border-white/10 bg-[#111111] p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-leanme-fuchsia">
            Report transfer
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            Suggerimenti per compattare ospiti con stesso orario di transfer e
            stesso mezzo.
          </p>
        </div>
        <button
          type="button"
          disabled={suggestions.length === 0}
          onClick={() => downloadTransferSuggestionsCsv(suggestions, event.title)}
          className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:border-leanme-fuchsia disabled:opacity-40"
        >
          Export Excel
        </button>
      </div>

      {suggestions.length === 0 ? (
        <p className="text-sm text-white/50">
          Nessun gruppo transfer ottimizzabile. Compila transfer e viaggi nelle
          schede ospiti.
        </p>
      ) : (
        <ul className="space-y-2">
          {suggestions.map((group) => (
            <li
              key={group.id}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-sm"
            >
              <p className="font-medium text-white">
                {group.direction === "in" ? "Arrivo" : "Partenza"} ·{" "}
                {group.transferTimeLabel} · {group.modeLabel}
              </p>
              <p className="mt-1 text-xs text-white/55">
                {group.guestCount} ospiti: {group.guestNames.join(", ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
