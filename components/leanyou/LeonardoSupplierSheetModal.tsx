"use client";

import { LeonardoSheetModal } from "@/components/leanyou/LeonardoSheetModal";
import { LeonardoSupplierSheetContent } from "@/components/leanyou/LeonardoSupplierSheetContent";
import { getSupplierCategoryLabel } from "@/lib/leanyou/supplier-categories";
import type { LeanYouSupplier } from "@/types/leanyou";

interface LeonardoSupplierSheetModalProps {
  supplier: LeanYouSupplier;
  onSupplierChange: (supplier: LeanYouSupplier) => void;
  onClose: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}

export function LeonardoSupplierSheetModal({
  supplier,
  onSupplierChange,
  onClose,
  onDelete,
  deleting,
}: LeonardoSupplierSheetModalProps) {
  return (
    <LeonardoSheetModal
      title={supplier.name}
      subtitle={`${getSupplierCategoryLabel(supplier.categoryId)} · j/k per navigare l'elenco`}
      busy={deleting}
      onClose={onClose}
    >
      <LeonardoSupplierSheetContent
        supplier={supplier}
        onSupplierChange={onSupplierChange}
        onDelete={onDelete}
        deleting={deleting}
      />
    </LeonardoSheetModal>
  );
}
