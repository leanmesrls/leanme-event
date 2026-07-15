"use client";

import { LeonardoSheetModal } from "@/components/leanyou/LeonardoSheetModal";
import { LeonardoVenueSheetContent } from "@/components/leanyou/LeonardoVenueSheetContent";
import type { LeonardoVenue } from "@/types/leanyou";

interface LeonardoVenueSheetModalProps {
  venue: LeonardoVenue;
  onVenueChange: (venue: LeonardoVenue) => void;
  onClose: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}

export function LeonardoVenueSheetModal({
  venue,
  onVenueChange,
  onClose,
  onDelete,
  deleting,
}: LeonardoVenueSheetModalProps) {
  return (
    <LeonardoSheetModal
      title={venue.name}
      subtitle={`${venue.city} · j/k per navigare l'elenco`}
      busy={deleting}
      onClose={onClose}
    >
      <LeonardoVenueSheetContent
        venue={venue}
        onVenueChange={onVenueChange}
        onDelete={onDelete}
        deleting={deleting}
      />
    </LeonardoSheetModal>
  );
}
