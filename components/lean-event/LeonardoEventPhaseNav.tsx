"use client";

import {
  EVENT_NAV_PHASES,
  formatTabBadge,
  getTabsForPhase,
  isEventModuleUnlocked,
  isEventTabAccessible,
  type EventNavBadges,
  type EventNavCapabilities,
  type EventPhaseId,
  type EventTabId,
} from "@/lib/lean-event/event-nav";
import type { LeanEventLeonardoCapabilities } from "@/types/lean-event";

interface LeonardoEventPhaseNavProps {
  activePhase: EventPhaseId;
  activeTab: EventTabId;
  capabilities: EventNavCapabilities;
  moduleCapabilities?: Partial<LeanEventLeonardoCapabilities>;
  badges?: EventNavBadges;
  onPhaseChange: (phase: EventPhaseId) => void;
  onTabChange: (tab: EventTabId) => void;
}

export function LeonardoEventPhaseNav({
  activePhase,
  activeTab,
  capabilities,
  moduleCapabilities = {},
  badges = {},
  onPhaseChange,
  onTabChange,
}: LeonardoEventPhaseNavProps) {
  const phaseTabs = getTabsForPhase(activePhase);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-zinc-950 p-2 sm:p-3">
        <div className="flex flex-wrap gap-1.5">
          {EVENT_NAV_PHASES.map((phase) => (
            <button
              key={phase.id}
              type="button"
              onClick={() => onPhaseChange(phase.id)}
              className={`rounded-md px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] transition sm:px-3.5 sm:text-[11px] ${
                activePhase === phase.id
                  ? "bg-leanme-fuchsia text-white shadow-sm"
                  : "border border-leanme-fuchsia/45 text-leanme-fuchsia hover:border-leanme-fuchsia hover:bg-leanme-fuchsia/10"
              }`}
            >
              {phase.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 px-0.5">
        {phaseTabs.map((tab) => {
          const hardDisabled =
            tab.implemented && !isEventTabAccessible(tab, capabilities);
          const moduleLocked = !isEventModuleUnlocked(tab, moduleCapabilities);
          const planned = !tab.implemented && !moduleLocked;
          const badge = formatTabBadge(tab, badges);
          return (
            <button
              key={tab.id}
              type="button"
              disabled={hardDisabled}
              onClick={() => onTabChange(tab.id)}
              className={`shrink-0 rounded-md px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] transition sm:text-[11px] ${
                activeTab === tab.id
                  ? "bg-white text-black shadow-sm"
                  : hardDisabled
                    ? "cursor-not-allowed border border-white/10 text-white/25"
                    : moduleLocked
                      ? "border border-dashed border-amber-400/35 text-amber-100/70 hover:border-amber-300/50 hover:text-amber-50"
                      : planned
                        ? "border border-dashed border-white/25 text-white/50 hover:border-white/50 hover:text-white/70"
                        : "border border-white/25 text-white/70 hover:border-white hover:bg-white/10 hover:text-white"
              }`}
              title={
                moduleLocked
                  ? "Modulo non incluso nel pacchetto — richiede upgrade"
                  : undefined
              }
            >
              {tab.label}
              {badge ? (
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] normal-case tracking-normal ${
                    activeTab === tab.id
                      ? "bg-black/10 text-black/70"
                      : "bg-white/10 text-white/70"
                  }`}
                >
                  {badge}
                </span>
              ) : null}
              {moduleLocked ? " ·" : planned ? " ·" : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}
