"use client";

import { LeonardoEventSupplierLinkContent } from "@/components/leanyou/LeonardoEventSupplierLinkContent";
import { LeonardoSheetModal } from "@/components/leanyou/LeonardoSheetModal";
import type { EventSupplierWithSupplier } from "@/lib/leanyou/event-suppliers";
import { getSupplierCategoryLabel } from "@/lib/leanyou/supplier-categories";

interface LeonardoEventSupplierLinkModalProps {
  tenantSlug: string;
  eventId: string;
  link: EventSupplierWithSupplier;
  onLinkChange: (link: EventSupplierWithSupplier) => void;
  onClose: () => void;
  onRemove: () => void;
}

export function LeonardoEventSupplierLinkModal({
  tenantSlug,
  eventId,
  link,
  onLinkChange,
  onClose,
  onRemove,
}: LeonardoEventSupplierLinkModalProps) {
  const supplierName = link.supplier?.name ?? "Fornitore evento";

  return (
    <LeonardoSheetModal
      title={supplierName}
      subtitle={`${getSupplierCategoryLabel(link.categoryId)} · Commessa fornitore`}
      onClose={onClose}
    >
      <LeonardoEventSupplierLinkContent
        tenantSlug={tenantSlug}
        eventId={eventId}
        link={link}
        onLinkChange={onLinkChange}
        onRemove={onRemove}
      />
    </LeonardoSheetModal>
  );
}
