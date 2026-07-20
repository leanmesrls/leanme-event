"use client";

import { usePathname, useRouter } from "next/navigation";

import { useLeonardoWorkTabs } from "@/components/lean-event/LeonardoWorkTabsContext";
import { LEONARDO_WORK_TAB_LIST_ID } from "@/lib/lean-event/work-tabs";
import { cn } from "@/lib/utils";

export function LeonardoWorkTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    tabs,
    sectionTabs,
    activeId,
    focusTab,
    focusList,
    closeTab,
    closeSectionList,
  } = useLeonardoWorkTabs();

  const showBar = sectionTabs.length > 0 || tabs.length > 0;
  if (!showBar) {
    return null;
  }

  function openSection(section: (typeof sectionTabs)[number]) {
    focusList();
    const onRoute =
      section.segment === "overview"
        ? pathname === section.href
        : pathname === section.href ||
          pathname.startsWith(`${section.href}/`);
    if (onRoute) {
      return;
    }
    router.push(section.href);
  }

  const listActive = activeId === LEONARDO_WORK_TAB_LIST_ID;

  return (
    <div
      role="tablist"
      aria-label="Schede di lavoro"
      className="mb-3 flex items-end gap-1 overflow-x-auto border-b border-white/10 pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {sectionTabs.map((section) => {
        // Overview href = base tenant: non usare startsWith (matcherebbe tutte le rotte)
        const onThisRoute =
          section.segment === "overview"
            ? pathname === section.href
            : pathname === section.href ||
              pathname.startsWith(`${section.href}/`);
        const active = listActive && onThisRoute;
        return (
          <div
            key={section.id}
            className={cn(
              "group flex shrink-0 items-center gap-0.5 rounded-t-md border border-b-0",
              active
                ? "border-white/20 bg-zinc-900"
                : "border-transparent hover:bg-white/[0.04]"
            )}
          >
            <button
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => openSection(section)}
              className={cn(
                "px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] transition sm:text-xs",
                active ? "text-white" : "text-white/45 group-hover:text-white/75"
              )}
            >
              {section.label}
            </button>
            {sectionTabs.length > 1 ? (
              <button
                type="button"
                aria-label={`Chiudi elenco ${section.label}`}
                onClick={(event) => {
                  event.stopPropagation();
                  closeSectionList(section.id);
                  if (onThisRoute && listActive && sectionTabs.length > 1) {
                    const other = sectionTabs.find((tab) => tab.id !== section.id);
                    if (other) {
                      router.push(other.href);
                    }
                  }
                }}
                className="mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-white/30 transition hover:bg-white/10 hover:text-white"
              >
                ×
              </button>
            ) : null}
          </div>
        );
      })}

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
