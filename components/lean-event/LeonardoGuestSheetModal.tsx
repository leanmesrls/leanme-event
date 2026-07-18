"use client";

import { useEffect } from "react";

import { LeonardoGuestHospitalityCard } from "@/components/lean-event/LeonardoGuestHospitalityCard";
import type { EventAssignmentWithContact } from "@/lib/lean-event/event-assignments";
import type {
  LeonardoAssignmentHospitality,
  LeonardoEventHotelBlock,
  LeonardoRelatedEvent,
  LeonardoRelatedEventParticipation,
  LeonardoVenue,
} from "@/types/lean-event";

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
        data-leonardo-canvas
        className="leonardo-canvas flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-white shadow-2xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p
              id="guest-sheet-title"
              className="truncate text-lg font-semibold text-zinc-900"
            >
              {assignment.contactName}
            </p>
            <p className="text-xs text-zinc-500">
              {assignment.roleLabel} · Scheda ospite
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onRemove ? (
              <button
                type="button"
                disabled={saving}
                onClick={onRemove}
                className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-red-300/80 transition hover:bg-red-500/10 hover:text-red-200 disabled:opacity-40"
              >
                Rimuovi
              </button>
            ) : null}
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-40"
            >
              Chiudi
            </button>
          </div>
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
          <p className="shrink-0 border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
