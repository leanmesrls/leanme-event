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

export const LEONARDO_WORK_TAB_LIST_ID = "list" as const;

export const LEONARDO_WORK_TABS_MAX = 10;

export function buildWorkTabId(
  kind: LeonardoWorkTabKind,
  entityId: string
): string {
  return `${kind}:${entityId}`;
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
  return `leonardo-work-tabs:v1:${tenantSlug}`;
}
