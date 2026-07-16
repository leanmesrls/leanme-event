import type { LeanEventSession } from "@/types/lean-event";

/** Tipi mostrati nel cestino UI (subset del dominio gestito). */
export type LeanEventTrashEntityType =
  | "event"
  | "contact"
  | "supplier"
  | "venue"
  | "assignment"
  | "workspace"
  | "event_supplier_link";

export interface LeanEventTrashItem {
  entityType: LeanEventTrashEntityType;
  id: string;
  tenantId: string;
  title: string;
  subtitle?: string;
  deletedAt: string;
  deletedBy?: string;
  purgeAfter?: string | null;
  revision: number;
}

export interface LeanEventTrashListResult {
  items: LeanEventTrashItem[];
}
