"use client";

import { LeonardoContactSheetContent } from "@/components/leanyou/LeonardoContactSheetContent";
import { LeonardoSheetModal } from "@/components/leanyou/LeonardoSheetModal";
import { formatContactName } from "@/lib/leanyou/contact-display";
import type { ContactAssignmentWithEvent } from "@/lib/leanyou/event-assignments";
import type { LeanYouContact } from "@/types/leanyou";

interface LeonardoContactSheetModalProps {
  tenantSlug: string;
  contact: LeanYouContact;
  onContactChange: (contact: LeanYouContact) => void;
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
