import categoriesData from "@/data/leanyou/supplier-categories.json";
import type { LeonardoSupplierCategoryId } from "@/types/leanyou";

export interface SupplierCategoryOption {
  id: LeonardoSupplierCategoryId;
  label: string;
}

export const SUPPLIER_CATEGORIES =
  categoriesData as SupplierCategoryOption[];

const categoryLabels = new Map(
  SUPPLIER_CATEGORIES.map((item) => [item.id, item.label])
);

export function isValidSupplierCategory(
  value: string
): value is LeonardoSupplierCategoryId {
  return categoryLabels.has(value as LeonardoSupplierCategoryId);
}

export function getSupplierCategoryLabel(
  categoryId: LeonardoSupplierCategoryId
): string {
  return categoryLabels.get(categoryId) ?? categoryId;
}
