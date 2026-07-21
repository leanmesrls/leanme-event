"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  createWorkTab,
  LEONARDO_SECTION_LIST_TABS_MAX,
  LEONARDO_WORK_TAB_LIST_ID,
  LEONARDO_WORK_TABS_MAX,
  workTabsStorageKey,
  type LeonardoSectionListTab,
  type LeonardoWorkTab,
  type LeonardoWorkTabKind,
} from "@/lib/lean-event/work-tabs";

interface LeonardoWorkTabsContextValue {
  tabs: LeonardoWorkTab[];
  sectionTabs: LeonardoSectionListTab[];
  activeId: string;
  openTab: (input: {
    kind: LeonardoWorkTabKind;
    entityId: string;
    title: string;
    contextId?: string;
  }) => void;
  closeTab: (tabId: string) => void;
  focusTab: (tabId: string) => void;
  focusList: () => void;
  touchSectionList: (section: LeonardoSectionListTab) => void;
  closeSectionList: (sectionId: string) => void;
  renameTab: (tabId: string, title: string) => void;
  isListActive: boolean;
}

const LeonardoWorkTabsContext =
  createContext<LeonardoWorkTabsContextValue | null>(null);

interface StoredState {
  tabs: LeonardoWorkTab[];
  sectionTabs: LeonardoSectionListTab[];
  activeId: string;
}

function readStored(tenantSlug: string): StoredState | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(workTabsStorageKey(tenantSlug));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    if (!Array.isArray(parsed.tabs)) {
      return null;
    }
    return {
      tabs: parsed.tabs.slice(0, LEONARDO_WORK_TABS_MAX),
      sectionTabs: Array.isArray(parsed.sectionTabs)
        ? parsed.sectionTabs.slice(0, LEONARDO_SECTION_LIST_TABS_MAX)
        : [],
      activeId: parsed.activeId || LEONARDO_WORK_TAB_LIST_ID,
    };
  } catch {
    return null;
  }
}

function writeStored(tenantSlug: string, state: StoredState) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(workTabsStorageKey(tenantSlug), JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
}

export function LeonardoWorkTabsProvider({
  tenantSlug,
  children,
}: {
  tenantSlug: string;
  children: ReactNode;
}) {
  const [tabs, setTabs] = useState<LeonardoWorkTab[]>([]);
  const [sectionTabs, setSectionTabs] = useState<LeonardoSectionListTab[]>([]);
  const [activeId, setActiveId] = useState<string>(LEONARDO_WORK_TAB_LIST_ID);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStored(tenantSlug);
    if (stored) {
      setTabs(stored.tabs);
      setSectionTabs(stored.sectionTabs);
      setActiveId(stored.activeId);
    } else {
      setTabs([]);
      setSectionTabs([]);
      setActiveId(LEONARDO_WORK_TAB_LIST_ID);
    }
    setHydrated(true);
  }, [tenantSlug]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeStored(tenantSlug, { tabs, sectionTabs, activeId });
  }, [tenantSlug, tabs, sectionTabs, activeId, hydrated]);

  const focusList = useCallback(() => {
    setActiveId(LEONARDO_WORK_TAB_LIST_ID);
  }, []);

  const focusTab = useCallback((tabId: string) => {
    setActiveId(tabId);
  }, []);

  const touchSectionList = useCallback((section: LeonardoSectionListTab) => {
    setSectionTabs((current) => {
      const existing = current.find((tab) => tab.id === section.id);
      if (existing) {
        return current.map((tab) =>
          tab.id === section.id ? { ...tab, ...section } : tab
        );
      }
      const withNew = [...current, section];
      if (withNew.length <= LEONARDO_SECTION_LIST_TABS_MAX) {
        return withNew;
      }
      return withNew.slice(withNew.length - LEONARDO_SECTION_LIST_TABS_MAX);
    });
  }, []);

  const closeSectionList = useCallback((sectionId: string) => {
    setSectionTabs((current) => current.filter((tab) => tab.id !== sectionId));
  }, []);

  const openTab = useCallback(
    (input: {
      kind: LeonardoWorkTabKind;
      entityId: string;
      title: string;
      contextId?: string;
    }) => {
      const next = createWorkTab(
        input.kind,
        input.entityId,
        input.title,
        input.contextId
      );
      setTabs((current) => {
        const existing = current.find((tab) => tab.id === next.id);
        if (existing) {
          return current.map((tab) =>
            tab.id === next.id
              ? {
                  ...tab,
                  title: next.title || tab.title,
                  contextId: next.contextId ?? tab.contextId,
                }
              : tab
          );
        }
        const withNew = [...current, next];
        if (withNew.length <= LEONARDO_WORK_TABS_MAX) {
          return withNew;
        }
        return withNew.slice(withNew.length - LEONARDO_WORK_TABS_MAX);
      });
      setActiveId(next.id);
    },
    []
  );

  const closeTab = useCallback((tabId: string) => {
    setTabs((current) => {
      const index = current.findIndex((tab) => tab.id === tabId);
      const nextTabs = current.filter((tab) => tab.id !== tabId);
      setActiveId((prev) => {
        if (prev !== tabId) {
          return prev;
        }
        const neighbor =
          nextTabs[Math.max(0, index - 1)] ?? nextTabs[0] ?? null;
        return neighbor?.id ?? LEONARDO_WORK_TAB_LIST_ID;
      });
      return nextTabs;
    });
  }, []);

  const renameTab = useCallback((tabId: string, title: string) => {
    setTabs((current) =>
      current.map((tab) =>
        tab.id === tabId ? { ...tab, title: title.trim() || tab.title } : tab
      )
    );
  }, []);

  const value = useMemo<LeonardoWorkTabsContextValue>(
    () => ({
      tabs,
      sectionTabs,
      activeId,
      openTab,
      closeTab,
      focusTab,
      focusList,
      touchSectionList,
      closeSectionList,
      renameTab,
      isListActive: activeId === LEONARDO_WORK_TAB_LIST_ID,
    }),
    [
      tabs,
      sectionTabs,
      activeId,
      openTab,
      closeTab,
      focusTab,
      focusList,
      touchSectionList,
      closeSectionList,
      renameTab,
    ]
  );

  return (
    <LeonardoWorkTabsContext.Provider value={value}>
      {children}
    </LeonardoWorkTabsContext.Provider>
  );
}

export function useLeonardoWorkTabs(): LeonardoWorkTabsContextValue {
  const ctx = useContext(LeonardoWorkTabsContext);
  if (!ctx) {
    throw new Error("useLeonardoWorkTabs must be used within LeonardoWorkTabsProvider");
  }
  return ctx;
}

/** Safe hook when shell might render outside provider (shouldn't). */
export function useLeonardoWorkTabsOptional(): LeonardoWorkTabsContextValue | null {
  return useContext(LeonardoWorkTabsContext);
}
