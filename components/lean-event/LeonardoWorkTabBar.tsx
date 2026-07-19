"use client";

import { usePathname } from "next/navigation";

import { useLeonardoWorkTabs } from "@/components/lean-event/LeonardoWorkTabsContext";
import { LEONARDO_WORK_TAB_LIST_ID } from "@/lib/lean-event/work-tabs";
import { cn } from "@/lib/utils";

function listLabelFromPath(pathname: string): string {
  if (pathname.includes("/eventi")) return "Eventi";
  if (pathname.includes("/contatti")) return "Contatti";
  if (pathname.includes("/sedi")) return "Sedi";
  if (pathname.includes("/fornitori")) return "Fornitori";
  if (pathname.includes("/verbali")) return "Verbali";
  if (pathname.includes("/documenti")) return "Documenti";
  if (pathname.includes("/clienti")) return "Clienti";
  if (pathname.includes("/finance")) return "Finance";
  if (pathname.includes("/government")) return "Government";
  if (pathname.includes("/lean-human")) return "Lean.Human";
  if (pathname.includes("/cestino")) return "Cestino";
  return "Elenco";
}

export function LeonardoWorkTabBar() {
  const pathname = usePathname();
  const { tabs, activeId, focusTab, focusList, closeTab } = useLeonardoWorkTabs();
  const listLabel = listLabelFromPath(pathname);

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div
      role="tablist"
      aria-label="Schede di lavoro"
      className="mb-3 flex items-end gap-1 overflow-x-auto border-b border-white/10 pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <button
        type="button"
        role="tab"
        aria-selected={activeId === LEONARDO_WORK_TAB_LIST_ID}
        onClick={focusList}
        className={cn(
          "shrink-0 rounded-t-md border border-b-0 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] transition sm:text-xs",
          activeId === LEONARDO_WORK_TAB_LIST_ID
            ? "border-white/20 bg-zinc-900 text-white"
            : "border-transparent text-white/45 hover:bg-white/[0.04] hover:text-white/75"
        )}
      >
        {listLabel}
      </button>

      {tabs.map((tab) => {
        const active = activeId === tab.id;
        return (
          <div
            key={tab.id}
            className={cn(
              "group flex max-w-[11rem] shrink-0 items-center gap-1 rounded-t-md border border-b-0 sm:max-w-[14rem]",
              active
                ? "border-white/20 bg-zinc-900"
                : "border-transparent hover:bg-white/[0.04]"
            )}
          >
            <button
              type="button"
              role="tab"
              aria-selected={active}
              title={tab.title}
              onClick={() => focusTab(tab.id)}
              className={cn(
                "min-w-0 flex-1 truncate px-2.5 py-2 text-left text-[11px] font-medium transition sm:px-3 sm:text-xs",
                active ? "text-white" : "text-white/50 group-hover:text-white/75"
              )}
            >
              {tab.title}
            </button>
            <button
              type="button"
              aria-label={`Chiudi ${tab.title}`}
              onClick={(event) => {
                event.stopPropagation();
                closeTab(tab.id);
              }}
              className="mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-white/35 transition hover:bg-white/10 hover:text-white"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
