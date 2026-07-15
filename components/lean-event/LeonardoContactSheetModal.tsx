"use client";

import { LeonardoContactSheetContent } from "@/components/lean-event/LeonardoContactSheetContent";
import { LeonardoSheetModal } from "@/components/lean-event/LeonardoSheetModal";
import { formatContactName } from "@/lib/lean-event/contact-display";
import type { ContactAssignmentWithEvent } from "@/lib/lean-event/event-assignments";
import type { LeanEventContact } from "@/types/lean-event";

interface LeonardoContactSheetModalProps {
  tenantSlug: string;
  contact: LeanEventContact;
  onContactChange: (contact: LeanEventContact) => void;
  onClose: () => void;
  assignments?: ContactAssignmentWithEvent[];
  onDelete?: () => void;
  deleting?: boolean;
}

export function LeonardoContactSheetModal({
  tenantSlug,
  contact,
  onContactChange,
  onClose,
  assignments,
  onDelete,
  deleting,
}: LeonardoContactSheetModalProps) {
  return (
    <LeonardoSheetModal
      title={formatContactName(contact)}
      subtitle="Scheda contatto · j/k per navigare l'elenco"
      busy={deleting}
      onClose={onClose}
    >
      <LeonardoContactSheetContent
        tenantSlug={tenantSlug}
        contact={contact}
        onContactChange={onContactChange}
        assignments={assignments}
        onDelete={onDelete}
        deleting={deleting}
      />
    </LeonardoSheetModal>
  );
}
