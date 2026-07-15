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
    <div className="space-y-2">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {EVENT_NAV_PHASES.map((phase) => (
          <button
            key={phase.id}
            type="button"
            onClick={() => onPhaseChange(phase.id)}
            className={`shrink-0 rounded-full px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] transition sm:text-xs ${
              activePhase === phase.id
                ? "bg-white text-black"
                : "border border-white/20 text-white/70 hover:border-leanme-fuchsia"
            }`}
          >
            {phase.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0d0d0d] p-2 sm:p-3">
        <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
          {EVENT_NAV_PHASES.find((phase) => phase.id === activePhase)?.label}
        </p>
        <div className="flex flex-wrap gap-1.5 px-0.5 pb-0.5">
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
                className={`shrink-0 rounded-lg px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] transition sm:px-3.5 sm:text-[11px] ${
                  activeTab === tab.id
                    ? "bg-leanme-fuchsia text-white shadow-sm"
                    : disabled
                      ? "cursor-not-allowed text-white/20"
                      : planned
                        ? "border border-dashed border-white/20 text-white/50 hover:border-leanme-fuchsia/50 hover:text-white/70"
                        : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                {tab.label}
                {badge ? (
                  <span className="ml-1.5 rounded-full bg-black/30 px-1.5 py-0.5 text-[9px] normal-case tracking-normal">
                    {badge}
                  </span>
                ) : null}
                {planned ? " ·" : ""}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
