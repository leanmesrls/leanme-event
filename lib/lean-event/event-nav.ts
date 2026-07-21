import type { LeanAgentAiCapability } from "@/lib/lean-event/ai-agents";
import type {
  LeanEventLeonardoCapabilities,
  LeonardoEventRoleCategory,
} from "@/types/lean-event";

export type EventPhaseId =
  | "setup"
  | "anagrafiche"
  | "programma"
  | "sponsor"
  | "patrocini"
  | "stampati"
  | "budget"
  | "output"
  | "tools"
  | "chat";

/** @deprecated Alias legacy — usare `anagrafiche` */
export type LegacyEventPhaseId = "operativita";

export type EventTabId =
  | "evento"
  | "formazione_ecm"
  | "allotment"
  | "eventi_correlati"
  | "programma"
  | "vedi_tutti"
  | "partecipanti"
  | "speakers"
  | "fornitori"
  | "sponsors_ruoli"
  | "segreteria"
  | "staff_interno"
  | "staff_esterno"
  | "altri_ospiti"
  | "delegazioni"
  | "sponsor_gestione"
  | "patrocini"
  | "comunicazioni"
  | "forms"
  | "engagements"
  | "web"
  | "writer_ai"
  | "designer_ai"
  | "traduzioni_ai"
  | "stampati"
  | "preventivi"
  | "consuntivi"
  | "import_bilancino"
  | "report"
  | "verbali"
  | "chat"
  /** @deprecated → vedi_tutti */
  | "ospiti";

/** @deprecated Usare tab report + sotto-tab; `ecm` → formazione_ecm */
export type LegacyEventTabId =
  | "ecm"
  | "ospiti"
  | "report_viaggi"
  | "report_transfer"
  | "report_hotel"
  | "report_partecipanti";

export type EventReportSubTab = "viaggi" | "transfer" | "hotel" | "partecipanti";

export type SpeakerSubRole =
  | "relatore"
  | "moderatore"
  | "chair"
  | "discussant";

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
  /** Capability abbonamento (Pro / Intelligence) — se off: tab cliccabile + upgrade */
  moduleCapability?: keyof LeanEventLeonardoCapabilities;
  aiCapability?: LeanAgentAiCapability;
  placeholderTitle?: string;
  placeholderDescription?: string;
  badgeKey?: keyof EventNavBadges;
  /** Filtro assegnazioni per tab anagrafiche */
  roleFilter?: LeonardoEventRoleCategory | LeonardoEventRoleCategory[];
}

export const EVENT_NAV_PHASES: EventNavPhase[] = [
  { id: "setup", label: "Setup" },
  { id: "anagrafiche", label: "Anagrafiche" },
  { id: "programma", label: "Programma" },
  { id: "sponsor", label: "Sponsor" },
  { id: "patrocini", label: "Patrocini" },
  { id: "stampati", label: "Stampati" },
  { id: "budget", label: "Budget" },
  { id: "output", label: "Output" },
  { id: "tools", label: "Tools" },
  { id: "chat", label: "Chat" },
];

export const SPEAKER_SUB_ROLES: Array<{ id: SpeakerSubRole; label: string }> = [
  { id: "relatore", label: "Relatore" },
  { id: "moderatore", label: "Moderatore" },
  { id: "chair", label: "Chair" },
  { id: "discussant", label: "Discussant" },
];

export const EVENT_NAV_TABS: EventNavTab[] = [
  {
    id: "evento",
    label: "Scheda tecnica",
    phase: "setup",
    implemented: true,
  },
  {
    id: "formazione_ecm",
    label: "Formazione e ECM",
    phase: "setup",
    implemented: true,
    aiCapability: "ecm",
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
    id: "vedi_tutti",
    label: "Vedi tutti",
    phase: "anagrafiche",
    implemented: true,
    capability: "ospiti",
    badgeKey: "ospiti",
  },
  {
    id: "partecipanti",
    label: "Partecipanti",
    phase: "anagrafiche",
    implemented: true,
    capability: "ospiti",
    roleFilter: "partecipante",
  },
  {
    id: "speakers",
    label: "Speakers",
    phase: "anagrafiche",
    implemented: true,
    capability: "ospiti",
    roleFilter: ["relatore", "moderatore", "chair", "discussant", "docente"],
  },
  {
    id: "fornitori",
    label: "Fornitori",
    phase: "anagrafiche",
    implemented: true,
  },
  {
    id: "sponsors_ruoli",
    label: "Sponsors",
    phase: "anagrafiche",
    implemented: true,
    capability: "ospiti",
    roleFilter: "sponsor",
  },
  {
    id: "segreteria",
    label: "Segreteria scientifica",
    phase: "anagrafiche",
    implemented: true,
    capability: "ospiti",
    roleFilter: "segreteria_scientifica",
  },
  {
    id: "staff_interno",
    label: "Staff interno",
    phase: "anagrafiche",
    implemented: true,
    capability: "ospiti",
    roleFilter: "staff_interno",
  },
  {
    id: "staff_esterno",
    label: "Staff esterno",
    phase: "anagrafiche",
    implemented: true,
    capability: "ospiti",
    roleFilter: "staff_esterno",
  },
  {
    id: "altri_ospiti",
    label: "Altri ospiti",
    phase: "anagrafiche",
    implemented: true,
    capability: "ospiti",
    roleFilter: "ospite",
  },
  {
    id: "delegazioni",
    label: "Delegazioni",
    phase: "anagrafiche",
    implemented: true,
    capability: "ospiti",
    roleFilter: "delegazione",
  },
  {
    id: "programma",
    label: "Programma",
    phase: "programma",
    implemented: true,
  },
  {
    id: "sponsor_gestione",
    label: "Gestione sponsor",
    phase: "sponsor",
    implemented: true,
  },
  {
    id: "patrocini",
    label: "Patrocini",
    phase: "patrocini",
    implemented: false,
    placeholderTitle: "Patrocini",
    placeholderDescription:
      "Enti e istituzioni che prestano patrocinio all'evento.",
  },
  {
    id: "stampati",
    label: "Stampati",
    phase: "stampati",
    implemented: true,
  },
  {
    id: "preventivi",
    label: "Preventivi",
    phase: "budget",
    implemented: false,
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
    id: "forms",
    label: "Forms",
    phase: "tools",
    implemented: false,
    moduleCapability: "survey",
    placeholderTitle: "Forms",
    placeholderDescription:
      "Usabile standalone o collegato all'evento: form, survey e raccolta dati i cui output possono finire in Tools.",
  },
  {
    id: "engagements",
    label: "Engagements",
    phase: "tools",
    implemented: false,
    moduleCapability: "connect",
    placeholderTitle: "Engagements",
    placeholderDescription:
      "Quiz e interazioni palco ↔ platea: standalone o legati all'evento, con materiali in Tools.",
  },
  {
    id: "comunicazioni",
    label: "Comunicazioni",
    phase: "tools",
    implemented: false,
    moduleCapability: "comunicazioni",
    placeholderTitle: "Comunicazioni",
    placeholderDescription:
      "Newsletter e SMS: workflow standalone o collegati all'evento e ai partecipanti.",
  },
  {
    id: "web",
    label: "Web",
    phase: "tools",
    implemented: false,
    moduleCapability: "public_site",
    placeholderTitle: "Web",
    placeholderDescription:
      "Portali evento e ospiti: configurabili a livello tenant e collegabili all'evento in Tools.",
  },
  {
    id: "verbali",
    label: "Verbali AI",
    phase: "tools",
    implemented: true,
    moduleCapability: "verbali",
  },
  {
    id: "writer_ai",
    label: "Writer AI",
    phase: "tools",
    implemented: false,
    moduleCapability: "ai_writing",
    placeholderTitle: "Writer AI",
    placeholderDescription:
      "Scrittura assistita standalone o per contenuti dell'evento (output in Tools).",
  },
  {
    id: "designer_ai",
    label: "Designer AI",
    phase: "tools",
    implemented: false,
    moduleCapability: "ai_graphics",
    placeholderTitle: "Designer AI",
    placeholderDescription:
      "Grafica assistita standalone o per materiali evento (output in Tools).",
  },
  {
    id: "traduzioni_ai",
    label: "Traduzioni AI",
    phase: "tools",
    implemented: false,
    moduleCapability: "ai_translations",
    placeholderTitle: "Traduzioni AI",
    placeholderDescription:
      "Traduzioni standalone o collegate ai contenuti dell'evento (output in Tools).",
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
  formazioneEcm?: boolean;
}

export interface EventNavBadges {
  ospiti?: number;
  ospitiIncomplete?: number;
  overbook?: number;
}

const LEGACY_TAB_MAP: Record<
  LegacyEventTabId,
  { tab: EventTabId; report?: EventReportSubTab }
> = {
  ecm: { tab: "formazione_ecm" },
  ospiti: { tab: "vedi_tutti" },
  report_viaggi: { tab: "report", report: "viaggi" },
  report_transfer: { tab: "report", report: "transfer" },
  report_hotel: { tab: "report", report: "hotel" },
  report_partecipanti: { tab: "report", report: "partecipanti" },
};

const LEGACY_PHASE_MAP: Record<string, EventPhaseId> = {
  operativita: "anagrafiche",
  comunicazioni: "tools",
  web: "tools",
};

const LEGACY_TAB_ALIASES: Record<string, EventTabId> = {
  pagina_evento: "web",
  pagina_ospiti: "web",
};

export function normalizeEventPhaseQuery(
  phase: string | null
): EventPhaseId | null {
  if (!phase) {
    return null;
  }
  if (phase in LEGACY_PHASE_MAP) {
    return LEGACY_PHASE_MAP[phase]!;
  }
  return EVENT_NAV_PHASES.find((item) => item.id === phase)?.id ?? null;
}

export function normalizeEventTabQuery(
  tab: string | null,
  report: string | null
): { tab: EventTabId; reportSubTab?: EventReportSubTab } {
  if (tab && tab in LEGACY_TAB_MAP) {
    const mapped = LEGACY_TAB_MAP[tab as LegacyEventTabId];
    return { tab: mapped.tab, reportSubTab: mapped.report };
  }

  const aliased = tab ? LEGACY_TAB_ALIASES[tab] : undefined;
  const resolved = aliased ?? tab;

  const validTab =
    EVENT_NAV_TABS.find((item) => item.id === resolved)?.id ?? "evento";
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
  if (tab.id === "formazione_ecm") {
    return capabilities.formazioneEcm === true;
  }
  if (tab.id === "report") {
    return capabilities.hotel || capabilities.logistica || true;
  }
  // Tool Pro/Intelligence: sempre navigabili; il lock abbonamento è gestito a parte
  if (tab.moduleCapability) {
    return true;
  }
  if (!tab.implemented) {
    return true;
  }
  if (!tab.capability) {
    return true;
  }
  return capabilities[tab.capability];
}

export function isEventModuleUnlocked(
  tab: EventNavTab,
  moduleCapabilities: Partial<LeanEventLeonardoCapabilities> | null | undefined
): boolean {
  if (!tab.moduleCapability) {
    return true;
  }
  return moduleCapabilities?.[tab.moduleCapability] === true;
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
  if (
    tab.badgeKey === "ospiti" &&
    badges.ospiti !== undefined &&
    badges.ospiti > 0
  ) {
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

export function isAnagrafichePeopleTab(tabId: EventTabId): boolean {
  return [
    "vedi_tutti",
    "partecipanti",
    "speakers",
    "sponsors_ruoli",
    "segreteria",
    "staff_interno",
    "staff_esterno",
    "altri_ospiti",
    "delegazioni",
    "ospiti",
  ].includes(tabId);
}
