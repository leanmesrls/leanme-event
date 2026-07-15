"use client";

import { LeonardoEventSupplierLinkContent } from "@/components/lean-event/LeonardoEventSupplierLinkContent";
import { LeonardoSheetModal } from "@/components/lean-event/LeonardoSheetModal";
import type { EventSupplierWithSupplier } from "@/lib/lean-event/event-suppliers";
import { getSupplierCategoryLabel } from "@/lib/lean-event/supplier-categories";

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
