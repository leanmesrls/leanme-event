export type LeonardoWorkTabKind =
  | "event"
  | "contact"
  | "venue"
  | "supplier";

export interface LeonardoWorkTab {
  id: string;
  kind: LeonardoWorkTabKind;
  entityId: string;
  title: string;
}

/** Elenco di sezione (Eventi, Contatti…) — navigabile senza perdere le altre. */
export interface LeonardoSectionListTab {
  id: string;
  segment: string;
  href: string;
  label: string;
}

export const LEONARDO_WORK_TAB_LIST_ID = "list" as const;

export const LEONARDO_WORK_TABS_MAX = 10;
export const LEONARDO_SECTION_LIST_TABS_MAX = 8;

export function buildWorkTabId(
  kind: LeonardoWorkTabKind,
  entityId: string
): string {
  return `${kind}:${entityId}`;
}

export function buildSectionListTabId(segment: string): string {
  return `section:${segment}`;
}

export function createWorkTab(
  kind: LeonardoWorkTabKind,
  entityId: string,
  title: string
): LeonardoWorkTab {
  return {
    id: buildWorkTabId(kind, entityId),
    kind,
    entityId,
    title: title.trim() || entityId.slice(0, 8),
  };
}

export function workTabsStorageKey(tenantSlug: string): string {
  return `leonardo-work-tabs:v2:${tenantSlug}`;
}

const SECTION_LABELS: Record<string, string> = {
  "": "Overview",
  eventi: "Eventi",
  contatti: "Contatti",
  sedi: "Sedi",
  fornitori: "Fornitori",
  verbali: "Verbali",
  documenti: "Documenti",
  clienti: "Clienti",
  finance: "Finance",
  government: "Government",
  "lean-human": "Lean.Human",
  cestino: "Cestino",
  profilo: "Profilo",
};

/** Segmenti con elenco “lavorabile” da tenere aperti in parallelo. */
const TRACKED_LIST_SEGMENTS = new Set([
  "eventi",
  "contatti",
  "sedi",
  "fornitori",
  "verbali",
  "documenti",
  "clienti",
  "cestino",
]);

export function resolveSectionListFromPath(
  pathname: string,
  tenantSlug: string
): LeonardoSectionListTab | null {
  const base = `/lean-event/${tenantSlug}`;
  const legacyBase = `/leanyou/${tenantSlug}`;
  let rest = "";
  if (pathname === base || pathname.startsWith(`${base}/`)) {
    rest = pathname.slice(base.length).replace(/^\//, "");
  } else if (pathname === legacyBase || pathname.startsWith(`${legacyBase}/`)) {
    rest = pathname.slice(legacyBase.length).replace(/^\//, "");
  } else {
    return null;
  }

  const parts = rest.split("/").filter(Boolean);
  const segment = parts[0] ?? "";
  // Solo elenco esatto (/eventi), non /eventi/[id] o /eventi/new
  if (parts.length !== 1 || !TRACKED_LIST_SEGMENTS.has(segment)) {
    return null;
  }

  return {
    id: buildSectionListTabId(segment),
    segment,
    href: `${base}/${segment}`,
    label: SECTION_LABELS[segment] ?? segment,
  };
}

export function sectionListLabelFromPath(pathname: string): string {
  for (const [segment, label] of Object.entries(SECTION_LABELS)) {
    if (!segment) continue;
    if (pathname.includes(`/${segment}`)) return label;
  }
  return "Elenco";
}
