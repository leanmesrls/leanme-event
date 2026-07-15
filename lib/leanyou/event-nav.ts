import type { LeanAgentAiCapability } from "@/lib/leanyou/ai-agents";

export type EventPhaseId =
  | "setup"
  | "operativita"
  | "budget"
  | "output"
  | "tools"
  | "chat";

export type EventTabId =
  | "evento"
  | "allotment"
  | "eventi_correlati"
  | "pagina_evento"
  | "pagina_ospiti"
  | "ospiti"
  | "fornitori"
  | "comunicazioni"
  | "segreteria"
  | "ecm"
  | "stampati"
  | "preventivi"
  | "consuntivi"
  | "import_bilancino"
  | "report"
  | "verbali"
  | "chat";

/** @deprecated Usare tab report + sotto-tab */
export type LegacyEventTabId =
  | "report_viaggi"
  | "report_transfer"
  | "report_hotel"
  | "report_partecipanti";

export type EventReportSubTab = "viaggi" | "transfer" | "hotel" | "partecipanti";

export interface EventNavPhase {
  id: EventPhaseId;
  label: string;
}

export interface EventNavTab {
  id: EventTabId;
  label: string;
  phase: EventPhaseId;
  implemented: boolean;
  capability?: "ospiti" | "hotel" | "logistica";
  aiCapability?: LeanAgentAiCapability;
  placeholderTitle?: string;
  placeholderDescription?: string;
  badgeKey?: keyof EventNavBadges;
}

export const EVENT_NAV_PHASES: EventNavPhase[] = [
  { id: "setup", label: "Setup" },
  { id: "operativita", label: "Operatività" },
  { id: "budget", label: "Budget" },
  { id: "output", label: "Output" },
  { id: "tools", label: "Tools" },
  { id: "chat", label: "Chat" },
];

export const EVENT_NAV_TABS: EventNavTab[] = [
  {
    id: "evento",
    label: "Scheda tecnica",
    phase: "setup",
    implemented: true,
  },
  {
    id: "allotment",
    label: "Allotment",
    phase: "setup",
    implemented: true,
    capability: "hotel",
  },
  {
    id: "eventi_correlati",
    label: "Eventi correlati",
    phase: "setup",
    implemented: true,
  },
  {
    id: "pagina_evento",
    label: "Pagina web evento",
    phase: "setup",
    implemented: false,
    aiCapability: "public_site",
    placeholderTitle: "Pagina web evento",
    placeholderDescription:
      "Configurazione della landing pubblica dell'evento: programma, iscrizioni, materiali e branding.",
  },
  {
    id: "pagina_ospiti",
    label: "Pagina web ospiti",
    phase: "setup",
    implemented: false,
    aiCapability: "participant_portal",
    placeholderTitle: "Portale ospiti",
    placeholderDescription:
      "Area riservata multi-evento per schede, form hospitality e aggiornamenti personali.",
  },
  {
    id: "ospiti",
    label: "Ospiti",
    phase: "operativita",
    implemented: true,
    capability: "ospiti",
    badgeKey: "ospiti",
  },
  {
    id: "fornitori",
    label: "Fornitori",
    phase: "operativita",
    implemented: true,
  },
  {
    id: "comunicazioni",
    label: "Comunicazioni",
    phase: "operativita",
    implemented: false,
    aiCapability: "comunicazioni",
    placeholderTitle: "Comunicazioni",
    placeholderDescription:
      "Invio newsletter e comunicazioni segmentate con template AI per relatori, sponsor e partecipanti.",
  },
  {
    id: "segreteria",
    label: "Segreteria scientifica",
    phase: "operativita",
    implemented: false,
    placeholderTitle: "Segreteria scientifica",
    placeholderDescription:
      "Archivio email, abstract, revisioni e coordinamento del comitato scientifico.",
  },
  {
    id: "ecm",
    label: "ECM",
    phase: "operativita",
    implemented: false,
    aiCapability: "ecm",
    placeholderTitle: "ECM",
    placeholderDescription:
      "Crediti, presenze, certificati e adempimenti per eventi formativi accreditati.",
  },
  {
    id: "stampati",
    label: "Stampati",
    phase: "operativita",
    implemented: true,
  },
  {
    id: "preventivi",
    label: "Preventivi",
    phase: "budget",
    implemented: false,
    aiCapability: "ai_assistant",
    placeholderTitle: "Preventivi",
    placeholderDescription:
      "Versioni di preventivo condivise con il cliente e storico delle revisioni approvate.",
  },
  {
    id: "consuntivi",
    label: "Consuntivi",
    phase: "budget",
    implemented: false,
    placeholderTitle: "Consuntivi",
    placeholderDescription:
      "Consuntivi di evento, versioni condivise con il cliente e confronto con il preventivo.",
  },
  {
    id: "import_bilancino",
    label: "Import bilancino",
    phase: "budget",
    implemented: false,
    placeholderTitle: "Import bilancino fatture",
    placeholderDescription:
      "Import del bilancino amministrativo per precompilare voci di consuntivo e riconciliazione.",
  },
  {
    id: "report",
    label: "Report",
    phase: "output",
    implemented: true,
    badgeKey: "overbook",
  },
  {
    id: "verbali",
    label: "Verbali AI",
    phase: "tools",
    implemented: true,
  },
  {
    id: "chat",
    label: "Chat team",
    phase: "chat",
    implemented: true,
  },
];

export interface EventNavCapabilities {
  ospiti: boolean;
  hotel: boolean;
  logistica: boolean;
}

export interface EventNavBadges {
  ospiti?: number;
  ospitiIncomplete?: number;
  overbook?: number;
}

const LEGACY_TAB_MAP: Record<LegacyEventTabId, { tab: EventTabId; report?: EventReportSubTab }> = {
  report_viaggi: { tab: "report", report: "viaggi" },
  report_transfer: { tab: "report", report: "transfer" },
  report_hotel: { tab: "report", report: "hotel" },
  report_partecipanti: { tab: "report", report: "partecipanti" },
};

export function normalizeEventTabQuery(
  tab: string | null,
  report: string | null
): { tab: EventTabId; reportSubTab?: EventReportSubTab } {
  if (tab && tab in LEGACY_TAB_MAP) {
    const mapped = LEGACY_TAB_MAP[tab as LegacyEventTabId];
    return { tab: mapped.tab, reportSubTab: mapped.report };
  }

  const validTab = EVENT_NAV_TABS.find((item) => item.id === tab)?.id ?? "evento";
  const validReport = ["viaggi", "transfer", "hotel", "partecipanti"].includes(
    report ?? ""
  )
    ? (report as EventReportSubTab)
    : undefined;

  return { tab: validTab, reportSubTab: validReport };
}

export function getTabsForPhase(phase: EventPhaseId): EventNavTab[] {
  return EVENT_NAV_TABS.filter((tab) => tab.phase === phase);
}

export function isEventTabAccessible(
  tab: EventNavTab,
  capabilities: EventNavCapabilities
): boolean {
  if (tab.id === "report") {
    return capabilities.hotel || capabilities.logistica || true;
  }
  if (!tab.implemented) {
    return true;
  }
  if (!tab.capability) {
    return true;
  }
  return capabilities[tab.capability];
}

export function getDefaultTabForPhase(
  phase: EventPhaseId,
  capabilities: EventNavCapabilities
): EventTabId {
  const tabs = getTabsForPhase(phase);
  const accessible = tabs.find(
    (tab) => tab.implemented && isEventTabAccessible(tab, capabilities)
  );
  return accessible?.id ?? tabs[0]?.id ?? "evento";
}

export function getPhaseForTab(tabId: EventTabId): EventPhaseId {
  return EVENT_NAV_TABS.find((tab) => tab.id === tabId)?.phase ?? "setup";
}

export function formatTabBadge(
  tab: EventNavTab,
  badges: EventNavBadges
): string | null {
  if (tab.badgeKey === "ospiti" && badges.ospiti !== undefined && badges.ospiti > 0) {
    const incomplete =
      badges.ospitiIncomplete && badges.ospitiIncomplete > 0
        ? ` · ${badges.ospitiIncomplete} incompleti`
        : "";
    return `${badges.ospiti}${incomplete}`;
  }
  if (tab.badgeKey === "overbook" && badges.overbook && badges.overbook > 0) {
    return `${badges.overbook} overbook`;
  }
  return null;
}
