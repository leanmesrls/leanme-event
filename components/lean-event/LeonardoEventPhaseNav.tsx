"use client";

import {
  EVENT_NAV_PHASES,
  formatTabBadge,
  getTabsForPhase,
  isEventTabAccessible,
  type EventNavBadges,
  type EventNavCapabilities,
  type EventPhaseId,
  type EventTabId,
} from "@/lib/lean-event/event-nav";

interface LeonardoEventPhaseNavProps {
  activePhase: EventPhaseId;
  activeTab: EventTabId;
  capabilities: EventNavCapabilities;
  badges?: EventNavBadges;
  onPhaseChange: (phase: EventPhaseId) => void;
  onTabChange: (tab: EventTabId) => void;
}

export function LeonardoEventPhaseNav({
  activePhase,
  activeTab,
  capabilities,
  badges = {},
  onPhaseChange,
  onTabChange,
}: LeonardoEventPhaseNavProps) {
  const phaseTabs = getTabsForPhase(activePhase);

  return (
    <div className="space-y-3">
      {/* Livello 1: fasi — bottoni squadrati fucsia, dentro il riquadro */}
      <div className="rounded-xl border border-white/10 bg-zinc-950 p-2 sm:p-3">
        <div className="-mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {EVENT_NAV_PHASES.map((phase) => (
            <button
              key={phase.id}
              type="button"
              onClick={() => onPhaseChange(phase.id)}
              className={`shrink-0 rounded-md px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] transition sm:text-xs ${
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

      {/* Livello 2: tab — stessi angoli squadrati del L1, bianchi, fuori dal riquadro */}
      <div className="flex flex-wrap gap-1.5 px-0.5">
        {phaseTabs.map((tab) => {
          const disabled =
            tab.implemented && !isEventTabAccessible(tab, capabilities);
          const planned = !tab.implemented;
          const badge = formatTabBadge(tab, badges);
          return (
            <button
              key={tab.id}
              type="button"
              disabled={disabled}
              onClick={() => onTabChange(tab.id)}
              className={`shrink-0 rounded-md px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] transition sm:text-[11px] ${
                activeTab === tab.id
                  ? "bg-white text-black shadow-sm"
                  : disabled
                    ? "cursor-not-allowed border border-white/10 text-white/25"
                    : planned
                      ? "border border-dashed border-white/25 text-white/50 hover:border-white/50 hover:text-white/70"
                      : "border border-white/25 text-white/70 hover:border-white hover:bg-white/10 hover:text-white"
              }`}
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
              {planned ? " ·" : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}
