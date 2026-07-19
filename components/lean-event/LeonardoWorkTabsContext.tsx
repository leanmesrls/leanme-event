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
  LEONARDO_WORK_TAB_LIST_ID,
  LEONARDO_WORK_TABS_MAX,
  workTabsStorageKey,
  type LeonardoWorkTab,
  type LeonardoWorkTabKind,
} from "@/lib/lean-event/work-tabs";

interface LeonardoWorkTabsContextValue {
  tabs: LeonardoWorkTab[];
  activeId: string;
  openTab: (input: {
    kind: LeonardoWorkTabKind;
    entityId: string;
    title: string;
  }) => void;
  closeTab: (tabId: string) => void;
  focusTab: (tabId: string) => void;
  focusList: () => void;
  renameTab: (tabId: string, title: string) => void;
  isListActive: boolean;
}

const LeonardoWorkTabsContext =
  createContext<LeonardoWorkTabsContextValue | null>(null);

interface StoredState {
  tabs: LeonardoWorkTab[];
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
    const parsed = JSON.parse(raw) as StoredState;
    if (!Array.isArray(parsed.tabs)) {
      return null;
    }
    return {
      tabs: parsed.tabs.slice(0, LEONARDO_WORK_TABS_MAX),
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
  const [activeId, setActiveId] = useState<string>(LEONARDO_WORK_TAB_LIST_ID);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStored(tenantSlug);
    if (stored) {
      setTabs(stored.tabs);
      setActiveId(stored.activeId);
    } else {
      setTabs([]);
      setActiveId(LEONARDO_WORK_TAB_LIST_ID);
    }
    setHydrated(true);
  }, [tenantSlug]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeStored(tenantSlug, { tabs, activeId });
  }, [tenantSlug, tabs, activeId, hydrated]);

  const focusList = useCallback(() => {
    setActiveId(LEONARDO_WORK_TAB_LIST_ID);
  }, []);

  const focusTab = useCallback((tabId: string) => {
    setActiveId(tabId);
  }, []);

  const openTab = useCallback(
    (input: {
      kind: LeonardoWorkTabKind;
      entityId: string;
      title: string;
    }) => {
      const next = createWorkTab(input.kind, input.entityId, input.title);
      setTabs((current) => {
        const existing = current.find((tab) => tab.id === next.id);
        if (existing) {
          return current.map((tab) =>
            tab.id === next.id
              ? { ...tab, title: next.title || tab.title }
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
      activeId,
      openTab,
      closeTab,
      focusTab,
      focusList,
      renameTab,
      isListActive: activeId === LEONARDO_WORK_TAB_LIST_ID,
    }),
    [
      tabs,
      activeId,
      openTab,
      closeTab,
      focusTab,
      focusList,
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
