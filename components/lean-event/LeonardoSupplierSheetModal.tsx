"use client";

import { LeonardoSheetModal } from "@/components/lean-event/LeonardoSheetModal";
import { LeonardoSupplierSheetContent } from "@/components/lean-event/LeonardoSupplierSheetContent";
import { getSupplierCategoryLabel } from "@/lib/lean-event/supplier-categories";
import type { LeanEventSupplier } from "@/types/lean-event";

interface LeonardoSupplierSheetModalProps {
  supplier: LeanEventSupplier;
  onSupplierChange: (supplier: LeanEventSupplier) => void;
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
