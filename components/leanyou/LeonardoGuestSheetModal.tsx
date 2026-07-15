"use client";

import { useEffect } from "react";

import { LeonardoGuestHospitalityCard } from "@/components/leanyou/LeonardoGuestHospitalityCard";
import type { EventAssignmentWithContact } from "@/lib/leanyou/event-assignments";
import type {
  LeonardoAssignmentHospitality,
  LeonardoEventHotelBlock,
  LeonardoRelatedEvent,
  LeonardoRelatedEventParticipation,
  LeonardoVenue,
} from "@/types/leanyou";

interface LeonardoGuestSheetModalProps {
  tenantSlug: string;
  eventId: string;
  assignment: EventAssignmentWithContact;
  allAssignments: EventAssignmentWithContact[];
  hotelBlocks: LeonardoEventHotelBlock[];
  venues: LeonardoVenue[];
  relatedEvents: LeonardoRelatedEvent[];
  saving: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (payload: {
    hospitality: LeonardoAssignmentHospitality;
    relatedParticipations: LeonardoRelatedEventParticipation[];
  }) => void;
  onRemove?: () => void;
}

export function LeonardoGuestSheetModal({
  tenantSlug,
  eventId,
  assignment,
  allAssignments,
  hotelBlocks,
  venues,
  relatedEvents,
  saving,
  error,
  onClose,
  onSave,
  onRemove,
}: LeonardoGuestSheetModalProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, saving]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-sheet-title"
      onClick={() => {
        if (!saving) {
          onClose();
        }
      }}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#111111] shadow-2xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p
              id="guest-sheet-title"
              className="truncate text-lg font-semibold text-white"
            >
              {assignment.contactName}
            </p>
            <p className="text-xs text-white/50">
              {assignment.roleLabel} · Scheda ospite
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            Chiudi
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
          <LeonardoGuestHospitalityCard
            variant="dialog"
            tenantSlug={tenantSlug}
            eventId={eventId}
            assignment={assignment}
            allAssignments={allAssignments}
            hotelBlocks={hotelBlocks}
            venues={venues}
            relatedEvents={relatedEvents}
            saving={saving}
            onSave={onSave}
            onRemove={onRemove}
          />
        </div>

        {error ? (
          <p className="shrink-0 border-t border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
