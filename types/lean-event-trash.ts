import type { LeanEventSession } from "@/types/lean-event";
import type { LeanEventManagedEntityType } from "@/lib/lean-event/entity-lifecycle";

export interface LeanEventTrashItem {
  entityType: LeanEventManagedEntityType;
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
