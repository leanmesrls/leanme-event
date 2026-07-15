import type { LeanYouSession } from "@/types/leanyou";
import type { LeanYouManagedEntityType } from "@/lib/leanyou/entity-lifecycle";

export interface LeanYouTrashItem {
  entityType: LeanYouManagedEntityType;
  id: string;
  tenantId: string;
  title: string;
  subtitle?: string;
  deletedAt: string;
  deletedBy?: string;
  purgeAfter?: string | null;
  revision: number;
}

export interface LeanYouTrashListResult {
  items: LeanYouTrashItem[];
}
