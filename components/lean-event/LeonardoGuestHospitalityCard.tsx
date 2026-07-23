"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { LeonardoDateInput } from "@/components/lean-event/LeonardoDateInput";
import { LeonardoDateTimeInput } from "@/components/lean-event/LeonardoDateTimeInput";
import { LeonardoCollapsibleSection } from "@/components/lean-event/LeonardoCollapsibleSection";
import { LeonardoCompanionFields } from "@/components/lean-event/LeonardoCompanionFields";
import { LeonardoGuestRelatedEventsSection } from "@/components/lean-event/LeonardoGuestRelatedEventsSection";
import { companionFromContact } from "@/lib/lean-event/companion";
import {
  normalizeRelatedParticipations,
} from "@/lib/lean-event/related-events";
import { summarizeRelatedParticipations } from "@/lib/lean-event/related-events-participation";
import {
  formatAllotmentLabel,
} from "@/lib/lean-event/event-hotel";
import {
  carTravelTimeField,
  carTravelTimeLabel,
  countAllotmentAssignments,
  emptyTravelSegment,
  HOSPITALITY_STATUS_LABELS,
  listHospitalityNightStays,
  LOYALTY_PROGRAMS_BY_MODE,
  normalizeAssignmentHospitality,
  roomTypeRequiresRoommate,
  ROOMMATE_ROLE_LABELS,
  TRAVEL_DIRECTION_LABELS,
  TRAVEL_MODE_LABELS,
  travelModeSupportsDocuments,
  travelModeSupportsLoyalty,
} from "@/lib/lean-event/hospitality";
import {
  buildNightStaysForGuestPeriod,
  listGuestNightDates,
  prefillNightStaysFromFirst,
  resolveNightAllotmentId,
} from "@/lib/lean-event/night-stays";
import {
  computeTransferInTime,
  computeTransferOutTime,
  formatTransferTimeLabel,
} from "@/lib/lean-event/transfer";
import { formatVenueLabel } from "@/lib/lean-event/venue-display";
import { leanEventLeonardoContactPath } from "@/lib/lean-event/paths";
import type { EventAssignmentWithContact } from "@/lib/lean-event/event-assignments";
import type {
  LeonardoAssignmentHospitality,
  TenantEventHotelBlock,
  LeonardoHospitalityStatus,
  LeonardoNightStay,
  LeonardoRelatedEvent,
  LeonardoRelatedEventParticipation,
  LeonardoRoommateRole,
  LeonardoTravelDirection,
  LeonardoTravelMode,
  LeonardoTravelSegment,
  LeonardoVenue,
} from "@/types/lean-event";

function uid(): string {
  return crypto.randomUUID();
}

interface LeonardoGuestHospitalityCardProps {
  variant?: "list" | "dialog";
  tenantSlug: string;
  eventId: string;
  assignment: EventAssignmentWithContact;
  allAssignments: EventAssignmentWithContact[];
  hotelBlocks: TenantEventHotelBlock[];
  venues: LeonardoVenue[];
  relatedEvents: LeonardoRelatedEvent[];
  expanded?: boolean;
  saving: boolean;
  onToggle?: () => void;
  onSave: (payload: {
    hospitality: LeonardoAssignmentHospitality;
    relatedParticipations: LeonardoRelatedEventParticipation[];
  }) => void;
  onRemove?: () => void;
}

export function LeonardoGuestHospitalityCard({
  variant = "list",
  tenantSlug,
  eventId,
  assignment,
  allAssignments,
  hotelBlocks,
  venues,
  relatedEvents,
  expanded = false,
  saving,
  onToggle,
  onSave,
  onRemove,
}: LeonardoGuestHospitalityCardProps) {
  const [form, setForm] = useState<LeonardoAssignmentHospitality>(() =>
    normalizeAssignmentHospitality(assignment.hospitality)
  );
  const [relatedParticipations, setRelatedParticipations] = useState<
    LeonardoRelatedEventParticipation[]
  >(() =>
    normalizeRelatedParticipations(
      relatedEvents,
      assignment.relatedParticipations
    )
  );
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [hotelOpen, setHotelOpen] = useState(true);
  const [travelsOpen, setTravelsOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [relatedOpen, setRelatedOpen] = useState(false);
  const [hotelHint, setHotelHint] = useState<string | null>(null);
  const isDialog = variant === "dialog";
  const showForm = isDialog || expanded;

  useEffect(() => {
    setForm(normalizeAssignmentHospitality(assignment.hospitality));
    setRelatedParticipations(
      normalizeRelatedParticipations(
        relatedEvents,
        assignment.relatedParticipations
      )
    );
  }, [assignment, relatedEvents]);

  const assignedStays = useMemo(
    () => listHospitalityNightStays(form),
    [form]
  );

  const needsRoommate = useMemo(() => {
    for (const stay of assignedStays) {
      const block = hotelBlocks.find((item) => item.id === stay.hotelBlockId);
      const night = block?.nightAllotments.find(
        (item) => item.id === stay.nightAllotmentId
      );
      const allotment = night?.roomAllotments.find(
        (item) => item.id === stay.roomAllotmentId
      );
      if (roomTypeRequiresRoommate(allotment)) {
        return true;
      }
    }
    return false;
  }, [assignedStays, hotelBlocks]);

  const participantOptions = useMemo(
    () =>
      allAssignments
        .filter((item) => item.contactId !== assignment.contactId)
        .map((item) => ({
          id: item.contactId,
          label: item.contactName,
          contact: item.contact,
        })),
    [allAssignments, assignment.contactId]
  );

  const statusLabel = HOSPITALITY_STATUS_LABELS[form.status];
  const relatedSummary = summarizeRelatedParticipations(
    relatedEvents,
    relatedParticipations
  );
  const roomSummary =
    assignedStays.length > 0
      ? `${assignedStays.length} nott${assignedStays.length === 1 ? "e" : "i"}`
      : form.roomTypeCode || "";

  function syncNightStaysFromPeriod(
    current: LeonardoAssignmentHospitality
  ): LeonardoNightStay[] {
    return buildNightStaysForGuestPeriod(
      current.checkIn,
      current.checkOut,
      hotelBlocks,
      current.nightStays
    );
  }

  function updateNightStay(stayId: string, patch: Partial<LeonardoNightStay>) {
    setForm((current) => {
      let nightStays = current.nightStays.map((stay) =>
        stay.id === stayId ? { ...stay, ...patch } : stay
      );
      let updated = nightStays.find((stay) => stay.id === stayId);
      if (!updated) {
        return current;
      }

      if (patch.hotelBlockId !== undefined) {
        const block = hotelBlocks.find((item) => item.id === patch.hotelBlockId);
        updated = {
          ...updated,
          hotelBlockId: patch.hotelBlockId,
          nightAllotmentId: resolveNightAllotmentId(block, updated.nightDate),
          roomAllotmentId: "",
          roomTypeCode: "",
        };
        nightStays = nightStays.map((stay) =>
          stay.id === stayId ? updated! : stay
        );
      }

      if (patch.roomAllotmentId) {
        const block = hotelBlocks.find((item) => item.id === updated!.hotelBlockId);
        const night = block?.nightAllotments.find(
          (item) => item.id === updated!.nightAllotmentId
        );
        const allotment = night?.roomAllotments.find(
          (item) => item.id === patch.roomAllotmentId
        );
        updated = {
          ...updated!,
          roomAllotmentId: patch.roomAllotmentId,
          roomTypeCode: allotment?.code ?? "",
        };
        const dates = listGuestNightDates(
          current.checkIn,
          current.checkOut,
          hotelBlocks
        );
        if (dates.length > 0) {
          nightStays = prefillNightStaysFromFirst(nightStays, dates, updated, hotelBlocks);
        } else {
          nightStays = nightStays.map((stay) =>
            stay.id === stayId ? updated! : stay
          );
        }
      } else if (patch.hotelBlockId !== undefined) {
        nightStays = nightStays.map((stay) =>
          stay.id === stayId ? updated! : stay
        );
      }

      return normalizeAssignmentHospitality({ ...current, nightStays });
    });
  }

  function recalculateTransfers(next: LeonardoAssignmentHospitality) {
    return {
      ...next,
      transferInTime: next.transferInTimeManual
        ? next.transferInTime
        : computeTransferInTime(next.travels, next.transferInMinutesAfter),
      transferOutTime: next.transferOutTimeManual
        ? next.transferOutTime
        : computeTransferOutTime(next.travels, next.transferOutMinutesBefore),
    };
  }

  async function uploadTravelDoc(
    segmentId: string,
    side: "document" | "front" | "back",
    file: File
  ) {
    const key = `${segmentId}-${side}`;
    setUploadingKey(key);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("segmentId", segmentId);
    formData.append("side", side);

    const response = await fetch(
      `/api/lean-event/events/${eventId}/assignments/${assignment.id}/travel-document`,
      { method: "POST", credentials: "same-origin", body: formData }
    );
    const payload = (await response.json()) as { error?: string; url?: string };
    setUploadingKey(null);

    if (!response.ok || !payload.url) {
      return;
    }

    setForm((current) =>
      recalculateTransfers({
        ...current,
        travels: current.travels.map((segment) => {
          if (segment.id !== segmentId) {
            return segment;
          }
          if (side === "front") {
            return { ...segment, documentFrontUrl: payload.url! };
          }
          if (side === "back") {
            return { ...segment, documentBackUrl: payload.url! };
          }
          return { ...segment, documentUrl: payload.url! };
        }),
      })
    );
  }

  function updateTravel(
    segmentId: string,
    patch: Partial<LeonardoTravelSegment>
  ) {
    setForm((current) =>
      recalculateTransfers({
        ...current,
        travels: current.travels.map((segment) =>
          segment.id === segmentId ? { ...segment, ...patch } : segment
        ),
      })
    );
  }

  const formContent = (
        <form
          className="min-w-0 space-y-4 overflow-hidden px-4 py-4"
          onSubmit={(event) => {
            event.preventDefault();
            setHotelHint(null);
            const normalized = normalizeAssignmentHospitality(form);
            if (
              needsRoommate &&
              normalized.roommateRole === "participant" &&
              !normalized.roommateContactId
            ) {
              if (
                !normalized.roommateFirstName.trim() ||
                !normalized.roommateLastName.trim()
              ) {
                setHotelHint(
                  "Compagno di camera partecipante: nome e cognome obbligatori."
                );
                return;
              }
              if (!normalized.roommateEmail.trim()) {
                setHotelHint(
                  "Email obbligatoria per iscrivere il compagno di camera come ospite nell'evento."
                );
                return;
              }
            }
            onSave({
              hospitality: normalized,
              relatedParticipations,
            });
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">Stato ospitalità</span>
            <select
              value={form.status}
              onChange={(event) =>
                setForm({
                  ...form,
                  status: event.target.value as LeonardoHospitalityStatus,
                })
              }
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            >
              {Object.entries(HOSPITALITY_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <HotelNightStaysEditor
            open={hotelOpen}
            onToggle={() => setHotelOpen((value) => !value)}
            form={form}
            hotelBlocks={hotelBlocks}
            venues={venues}
            assignmentId={assignment.id}
            allAssignments={allAssignments}
            onCheckInChange={(checkIn) =>
              setForm((current) =>
                normalizeAssignmentHospitality({
                  ...current,
                  checkIn,
                  nightStays: syncNightStaysFromPeriod({ ...current, checkIn }),
                })
              )
            }
            onCheckOutChange={(checkOut) =>
              setForm((current) =>
                normalizeAssignmentHospitality({
                  ...current,
                  checkOut,
                  nightStays: syncNightStaysFromPeriod({ ...current, checkOut }),
                })
              )
            }
            onGenerateNights={() => {
              const dates = listGuestNightDates(
                form.checkIn,
                form.checkOut,
                hotelBlocks
              );
              if (dates.length === 0) {
                setHotelHint(
                  "Imposta check-in e check-out validi (check-out successivo al check-in)."
                );
                return;
              }
              setHotelHint(`${dates.length} notti generate.`);
              setForm((current) =>
                normalizeAssignmentHospitality({
                  ...current,
                  nightStays: syncNightStaysFromPeriod(current),
                })
              );
            }}
            hotelHint={hotelHint}
            onUpdateStay={updateNightStay}
          />

          {needsRoommate ? (
            <div className="space-y-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-100/80">
                Secondo occupante camera (doppia / matrimoniale)
              </p>
              <LeonardoCompanionFields
                title="Compagno di camera"
                participantOptions={participantOptions}
                emailRequired={
                  form.roommateRole === "participant" && !form.roommateContactId
                }
                value={{
                  contactId: form.roommateContactId,
                  firstName: form.roommateFirstName,
                  lastName: form.roommateLastName,
                  phone: form.roommatePhone,
                  email: form.roommateEmail,
                }}
                onChange={(value) => {
                  const linked = value.contactId
                    ? participantOptions.find((item) => item.id === value.contactId)
                    : null;
                  setForm({
                    ...form,
                    roommateContactId: value.contactId,
                    roommateFirstName: linked
                      ? companionFromContact(linked.contact).firstName
                      : value.firstName,
                    roommateLastName: linked
                      ? companionFromContact(linked.contact).lastName
                      : value.lastName,
                    roommatePhone: linked
                      ? companionFromContact(linked.contact).phone
                      : value.phone,
                    roommateEmail: linked
                      ? companionFromContact(linked.contact).email
                      : value.email,
                    roommateName: `${value.firstName} ${value.lastName}`.trim(),
                    roommateRole: value.contactId
                      ? "participant"
                      : value.firstName || value.lastName
                        ? form.roommateRole ?? "companion_only"
                        : null,
                  });
                }}
              />
              <label className="block text-sm">
                <span className="mb-1 block text-white/60">Ruolo secondo occupante</span>
                <select
                  value={form.roommateRole ?? ""}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      roommateRole: (event.target.value ||
                        null) as LeonardoRoommateRole | null,
                    })
                  }
                  className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
                >
                  <option value="">—</option>
                  {Object.entries(ROOMMATE_ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          <LeonardoGuestRelatedEventsSection
            open={relatedOpen}
            onToggle={() => setRelatedOpen((value) => !value)}
            summary={relatedSummary}
            relatedEvents={relatedEvents}
            participations={relatedParticipations}
            participantOptions={participantOptions}
            onChange={setRelatedParticipations}
          />

          <TravelSegmentsEditor
            open={travelsOpen}
            onToggle={() => setTravelsOpen((value) => !value)}
            travels={form.travels}
            uploadingKey={uploadingKey}
            onAdd={() =>
              setForm((current) =>
                recalculateTransfers({
                  ...current,
                  travels: [
                    ...current.travels,
                    emptyTravelSegment({ id: uid(), direction: "outbound" }),
                  ],
                })
              )
            }
            onRemove={(segmentId) =>
              setForm((current) =>
                recalculateTransfers({
                  ...current,
                  travels: current.travels.filter(
                    (segment) => segment.id !== segmentId
                  ),
                })
              )
            }
            onChange={updateTravel}
            onUpload={uploadTravelDoc}
          />

          <TransferEditor
            open={transferOpen}
            onToggle={() => setTransferOpen((value) => !value)}
            form={form}
            setForm={setForm}
          />

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-white/60">Intolleranze alimentari</span>
              <input
                value={form.allergies}
                onChange={(event) =>
                  setForm({ ...form, allergies: event.target.value })
                }
                className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-white/60">Esigenze mobilità ridotta</span>
              <input
                value={form.dietaryRequirements}
                onChange={(event) =>
                  setForm({ ...form, dietaryRequirements: event.target.value })
                }
                className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="sticky bottom-0 z-10 mt-4 w-full rounded-full bg-leanme-fuchsia px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white shadow-[0_-8px_24px_rgba(0,0,0,0.45)] transition hover:bg-leanme-fuchsia-dark disabled:opacity-60 sm:w-auto"
          >
            {saving ? "Salvataggio…" : "Salva scheda ospite"}
          </button>

          {isDialog && onRemove ? (
            <div className="border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={onRemove}
                disabled={saving}
                className="w-full rounded-full border border-red-500/30 px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-red-200 transition hover:border-red-400 hover:bg-red-500/10 disabled:opacity-50 sm:w-auto"
              >
                Rimuovi dall&apos;evento
              </button>
              <p className="mt-2 text-xs text-white/40">
                L&apos;ospite esce dall&apos;elenco e i contatori allotment si
                aggiornano. Recuperabile dal cestino per 30 giorni.
              </p>
            </div>
          ) : null}
        </form>
  );

  if (isDialog) {
    return formContent;
  }

  return (
    <li className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-black/20">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2 px-4 py-3 text-left"
        >
          <div className="min-w-0">
            <p className="font-medium text-white">
              <Link
                href={leanEventLeonardoContactPath(
                  tenantSlug,
                  assignment.contactId
                )}
                onClick={(event) => event.stopPropagation()}
                className="transition hover:text-leanme-fuchsia"
              >
                {assignment.contactName}
              </Link>
            </p>
            <p className="text-xs text-white/50">
              {assignment.roleLabel}
              {roomSummary ? ` · ${roomSummary}` : ""}
              {form.travels.length > 0 ? ` · ${form.travels.length} tratte` : ""}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/60">
            {statusLabel}
          </span>
        </button>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 px-4 text-xs font-semibold uppercase tracking-[0.08em] text-white/45 transition hover:text-red-300"
          >
            Rimuovi
          </button>
        ) : null}
      </div>

      {showForm ? formContent : null}
    </li>
  );
}

function HotelNightStaysEditor({
  open,
  onToggle,
  form,
  hotelBlocks,
  venues,
  assignmentId,
  allAssignments,
  onCheckInChange,
  onCheckOutChange,
  onGenerateNights,
  onUpdateStay,
  hotelHint,
}: {
  open: boolean;
  onToggle: () => void;
  form: LeonardoAssignmentHospitality;
  hotelBlocks: TenantEventHotelBlock[];
  venues: LeonardoVenue[];
  assignmentId: string;
  allAssignments: EventAssignmentWithContact[];
  onCheckInChange: (value: string) => void;
  onCheckOutChange: (value: string) => void;
  onGenerateNights: () => void;
  onUpdateStay: (stayId: string, patch: Partial<LeonardoNightStay>) => void;
  hotelHint: string | null;
}) {
  const stayCount = form.nightStays.length;
  const assignedCount = listHospitalityNightStays(form).length;

  return (
    <LeonardoCollapsibleSection
      title={`Hotel (${assignedCount}/${stayCount || "0"} notti assegnate)`}
      open={open}
      onToggle={onToggle}
    >
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
            <label className="block min-w-0 text-sm">
              <span className="mb-1 block text-xs text-white/55">Check-in</span>
              <LeonardoDateInput
                value={form.checkIn}
                onChange={onCheckInChange}
                className="w-full min-w-0 rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
              />
            </label>
            <label className="block min-w-0 text-sm">
              <span className="mb-1 block text-xs text-white/55">Check-out</span>
              <LeonardoDateInput
                value={form.checkOut}
                onChange={onCheckOutChange}
                className="w-full min-w-0 rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
              />
            </label>
            <button
              type="button"
              onClick={onGenerateNights}
              className="h-fit rounded-full border border-white/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:border-leanme-fuchsia sm:self-end"
            >
              Genera notti
            </button>
          </div>

          {hotelHint ? (
            <p className="text-xs text-leanme-fuchsia">{hotelHint}</p>
          ) : null}

          {form.nightStays.length === 0 ? (
            <p className="text-xs text-white/45">
              Imposta check-in/check-out e clicca «Genera notti» per assegnare una
              camera per ogni pernottamento.
            </p>
          ) : (
            <div className="min-w-0 space-y-2 overflow-x-auto">
              {form.nightStays.map((stay) => {
                const block = hotelBlocks.find(
                  (item) => item.id === stay.hotelBlockId
                );
                const night = block?.nightAllotments.find(
                  (item) =>
                    item.id === stay.nightAllotmentId ||
                    item.nightDate.trim() === stay.nightDate.trim()
                );
                const nightId = night?.id ?? stay.nightAllotmentId;

                return (
                  <div
                    key={stay.id}
                    className="grid min-w-0 max-w-full grid-cols-1 gap-2 rounded-lg border border-white/10 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(5.5rem,auto)_minmax(0,1fr)_minmax(0,1fr)]"
                  >
                    <p className="min-w-0 truncate text-sm font-medium text-white/80 sm:col-span-2 xl:col-span-1 xl:pt-2">
                      {stay.nightDate || "—"}
                    </p>
                    <label className="block min-w-0 text-sm">
                      <span className="mb-1 block text-[10px] uppercase tracking-[0.08em] text-white/45 xl:hidden">
                        Hotel
                      </span>
                      <select
                        value={stay.hotelBlockId}
                        onChange={(event) =>
                          onUpdateStay(stay.id, {
                            hotelBlockId: event.target.value,
                          })
                        }
                        className="w-full min-w-0 rounded-lg border border-white/15 bg-black px-2 py-2 text-sm"
                      >
                      <option value="">Hotel</option>
                      {hotelBlocks.map((item, index) => {
                        const venue = venues.find((v) => v.id === item.venueId);
                        return (
                          <option key={item.id} value={item.id}>
                            {venue
                              ? formatVenueLabel(venue)
                              : `Hotel ${index + 1}`}
                          </option>
                        );
                      })}
                      </select>
                    </label>
                    <label className="block min-w-0 text-sm">
                      <span className="mb-1 block text-[10px] uppercase tracking-[0.08em] text-white/45 xl:hidden">
                        Camera
                      </span>
                      <select
                        value={stay.roomAllotmentId}
                        onChange={(event) =>
                          onUpdateStay(stay.id, {
                            roomAllotmentId: event.target.value,
                          })
                        }
                        disabled={!block || !night}
                        className="w-full min-w-0 rounded-lg border border-white/15 bg-black px-2 py-2 text-sm disabled:opacity-50"
                      >
                      <option value="">Tipologia camera</option>
                      {night?.roomAllotments.map((allotment) => {
                        const used = countAllotmentAssignments(
                          allAssignments,
                          stay.hotelBlockId,
                          nightId,
                          allotment.id,
                          false,
                          { assignmentId, stayId: stay.id }
                        );
                        const remaining = Math.max(
                          0,
                          allotment.quantity - used
                        );
                        const isCurrent = stay.roomAllotmentId === allotment.id;
                        const disabled =
                          allotment.quantity <= 0 ||
                          (remaining <= 0 && !isCurrent);
                        return (
                          <option
                            key={allotment.id}
                            value={allotment.id}
                            disabled={disabled}
                          >
                            {formatAllotmentLabel(allotment)} (
                            {isCurrent
                              ? `${used + (isCurrent ? 1 : 0)}/${allotment.quantity}`
                              : `${remaining} libere`}
                            )
                          </option>
                        );
                      })}
                      </select>
                    </label>
                  </div>
                );
              })}
            </div>
          )}
    </LeonardoCollapsibleSection>
  );
}

function TransferEditor({
  open,
  onToggle,
  form,
  setForm,
}: {
  open: boolean;
  onToggle: () => void;
  form: LeonardoAssignmentHospitality;
  setForm: React.Dispatch<React.SetStateAction<LeonardoAssignmentHospitality>>;
}) {
  function patchTransfer(patch: Partial<LeonardoAssignmentHospitality>) {
    setForm((current) => {
      const next = { ...current, ...patch };
      if (!next.transferInTimeManual) {
        next.transferInTime = computeTransferInTime(
          next.travels,
          next.transferInMinutesAfter
        );
      }
      if (!next.transferOutTimeManual) {
        next.transferOutTime = computeTransferOutTime(
          next.travels,
          next.transferOutMinutesBefore
        );
      }
      return next;
    });
  }

  const transferSummary = [
    form.transferIn ? "Arrivo" : null,
    form.transferOut ? "Partenza" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <LeonardoCollapsibleSection
      title={`Transfer${transferSummary ? ` (${transferSummary})` : ""}`}
      open={open}
      onToggle={onToggle}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.transferIn}
            onChange={(event) =>
              patchTransfer({ transferIn: event.target.checked })
            }
            className="accent-leanme-fuchsia"
          />
          Transfer arrivo
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.transferOut}
            onChange={(event) =>
              patchTransfer({ transferOut: event.target.checked })
            }
            className="accent-leanme-fuchsia"
          />
          Transfer partenza
        </label>
      </div>

      {form.transferIn ? (
        <div className="grid gap-3 rounded-lg border border-white/10 p-3 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-white/55">
              Minuti dopo ultima tratta di arrivo
            </span>
            <input
              type="number"
              min={0}
              step={5}
              value={form.transferInMinutesAfter}
              onChange={(event) =>
                patchTransfer({
                  transferInMinutesAfter: Number(event.target.value) || 0,
                  transferInTimeManual: false,
                })
              }
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-white/55">
              Orario transfer (arrotondato al quarto d&apos;ora)
            </span>
            <LeonardoDateTimeInput
              value={form.transferInTime}
              onChange={(transferInTime) =>
                setForm((current) => ({
                  ...current,
                  transferInTime,
                  transferInTimeManual: true,
                }))
              }
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm"
            />
            {form.transferInTime ? (
              <p className="mt-1 text-xs text-white/45">
                {formatTransferTimeLabel(form.transferInTime)}
                {form.transferInTimeManual ? " · manuale" : " · calcolato"}
              </p>
            ) : null}
          </label>
        </div>
      ) : null}

      {form.transferOut ? (
        <div className="grid gap-3 rounded-lg border border-white/10 p-3 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-white/55">
              Minuti prima prima tratta di ritorno
            </span>
            <input
              type="number"
              min={0}
              step={5}
              value={form.transferOutMinutesBefore}
              onChange={(event) =>
                patchTransfer({
                  transferOutMinutesBefore: Number(event.target.value) || 0,
                  transferOutTimeManual: false,
                })
              }
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-white/55">
              Orario transfer (arrotondato al quarto d&apos;ora, margine extra)
            </span>
            <LeonardoDateTimeInput
              value={form.transferOutTime}
              onChange={(transferOutTime) =>
                setForm((current) => ({
                  ...current,
                  transferOutTime,
                  transferOutTimeManual: true,
                }))
              }
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm"
            />
            {form.transferOutTime ? (
              <p className="mt-1 text-xs text-white/45">
                {formatTransferTimeLabel(form.transferOutTime)}
                {form.transferOutTimeManual ? " · manuale" : " · calcolato"}
              </p>
            ) : null}
          </label>
        </div>
      ) : null}

      <label className="block text-sm">
        <span className="mb-1 block text-xs text-white/55">Note transfer</span>
        <input
          value={form.transferNotes}
          onChange={(event) =>
            setForm({ ...form, transferNotes: event.target.value })
          }
          className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm"
        />
      </label>
    </LeonardoCollapsibleSection>
  );
}

function TravelSegmentsEditor({
  open,
  onToggle,
  travels,
  uploadingKey,
  onAdd,
  onRemove,
  onChange,
  onUpload,
}: {
  open: boolean;
  onToggle: () => void;
  travels: LeonardoTravelSegment[];
  uploadingKey: string | null;
  onAdd: () => void;
  onRemove: (segmentId: string) => void;
  onChange: (segmentId: string, patch: Partial<LeonardoTravelSegment>) => void;
  onUpload: (
    segmentId: string,
    side: "document" | "front" | "back",
    file: File
  ) => Promise<void>;
}) {
  return (
    <LeonardoCollapsibleSection
      title={`Viaggi (${travels.length} tratte)`}
      open={open}
      onToggle={onToggle}
      actions={
        <button
          type="button"
          onClick={onAdd}
          className="text-[11px] font-semibold uppercase tracking-[0.08em] text-leanme-fuchsia"
        >
          + Tratta
        </button>
      }
    >
      {travels.length === 0 ? (
        <p className="text-xs text-white/45">
          Aggiungi tratte andata/ritorno con orari, fidelity card e documenti.
        </p>
      ) : (
        travels.map((segment) => (
          <div
            key={segment.id}
            className="grid gap-2 rounded-lg border border-white/10 p-3 md:grid-cols-2"
          >
            <div className="flex items-center justify-between md:col-span-2">
              <span className="text-xs font-medium text-white/70">
                {TRAVEL_DIRECTION_LABELS[segment.direction]} ·{" "}
                {TRAVEL_MODE_LABELS[segment.mode]}
              </span>
              <button
                type="button"
                onClick={() => onRemove(segment.id)}
                className="text-xs text-white/40 hover:text-red-300"
              >
                Rimuovi
              </button>
            </div>
            <select
              value={segment.direction}
              onChange={(event) => {
                const direction = event.target.value as LeonardoTravelDirection;
                onChange(segment.id, {
                  direction,
                  departureAt:
                    segment.mode === "car" && direction === "outbound"
                      ? ""
                      : segment.departureAt,
                  arrivalAt:
                    segment.mode === "car" && direction === "return"
                      ? ""
                      : segment.arrivalAt,
                });
              }}
              className="rounded-lg border border-white/15 bg-black px-2 py-2 text-sm"
            >
              {Object.entries(TRAVEL_DIRECTION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={segment.mode}
              onChange={(event) => {
                const mode = event.target.value as LeonardoTravelMode;
                onChange(segment.id, {
                  mode,
                  loyaltyProgram: "",
                  loyaltyCode: "",
                  originCity: mode === "train" ? segment.originCity : "",
                  originAirport: mode === "flight" ? segment.originAirport : "",
                  destinationAirport:
                    mode === "flight" ? segment.destinationAirport : "",
                  departureAt:
                    segment.mode === "car" && segment.direction === "outbound"
                      ? ""
                      : segment.departureAt,
                  arrivalAt:
                    segment.mode === "car" && segment.direction === "return"
                      ? ""
                      : segment.arrivalAt,
                });
              }}
              className="rounded-lg border border-white/15 bg-black px-2 py-2 text-sm"
            >
              {Object.entries(TRAVEL_MODE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {segment.mode !== "car" ? (
              <input
                placeholder="Vettore (Trenitalia, ITA, …)"
                value={segment.carrier}
                onChange={(event) =>
                  onChange(segment.id, { carrier: event.target.value })
                }
                className="rounded-lg border border-white/15 bg-black px-2 py-2 text-sm md:col-span-2"
              />
            ) : null}
            {travelModeSupportsLoyalty(segment.mode) ? (
              <>
                <select
                  value={segment.loyaltyProgram}
                  onChange={(event) =>
                    onChange(segment.id, { loyaltyProgram: event.target.value })
                  }
                  className="rounded-lg border border-white/15 bg-black px-2 py-2 text-sm"
                >
                  <option value="">Programma fidelity</option>
                  {LOYALTY_PROGRAMS_BY_MODE[segment.mode].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Codice fidelity / carta"
                  value={segment.loyaltyCode}
                  onChange={(event) =>
                    onChange(segment.id, { loyaltyCode: event.target.value })
                  }
                  className="rounded-lg border border-white/15 bg-black px-2 py-2 text-sm"
                />
              </>
            ) : null}
            {segment.mode === "train" ? (
              <input
                placeholder="Città provenienza"
                value={segment.originCity}
                onChange={(event) =>
                  onChange(segment.id, { originCity: event.target.value })
                }
                className="rounded-lg border border-white/15 bg-black px-2 py-2 text-sm md:col-span-2"
              />
            ) : null}
            {segment.mode === "flight" ? (
              <>
                <input
                  placeholder="Aeroporto partenza"
                  value={segment.originAirport}
                  onChange={(event) =>
                    onChange(segment.id, { originAirport: event.target.value })
                  }
                  className="rounded-lg border border-white/15 bg-black px-2 py-2 text-sm"
                />
                <input
                  placeholder="Aeroporto arrivo"
                  value={segment.destinationAirport}
                  onChange={(event) =>
                    onChange(segment.id, {
                      destinationAirport: event.target.value,
                    })
                  }
                  className="rounded-lg border border-white/15 bg-black px-2 py-2 text-sm"
                />
              </>
            ) : null}
            {segment.mode === "car" ? (
              <label className="block md:col-span-2">
                <span className="mb-1 block text-xs text-white/55">
                  {carTravelTimeLabel(segment.direction)}
                </span>
                <LeonardoDateTimeInput
                  value={segment[carTravelTimeField(segment.direction)]}
                  onChange={(value) =>
                    onChange(segment.id, {
                      [carTravelTimeField(segment.direction)]: value,
                    })
                  }
                  className="w-full rounded-lg border border-white/15 bg-black px-2 py-2 text-sm"
                />
              </label>
            ) : (
              <>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs text-white/55">Partenza</span>
                  <LeonardoDateTimeInput
                    value={segment.departureAt}
                    onChange={(departureAt) =>
                      onChange(segment.id, { departureAt })
                    }
                    className="rounded-lg border border-white/15 bg-black px-2 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs text-white/55">Arrivo</span>
                  <LeonardoDateTimeInput
                    value={segment.arrivalAt}
                    onChange={(arrivalAt) =>
                      onChange(segment.id, { arrivalAt })
                    }
                    className="rounded-lg border border-white/15 bg-black px-2 py-2 text-sm"
                  />
                </label>
              </>
            )}
            {travelModeSupportsDocuments(segment.mode) ? (
              <div className="space-y-2 md:col-span-2">
                <p className="text-xs text-white/45">
                  Documento volo: PDF unico oppure fronte/retro
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { side: "document" as const, label: "PDF/doc" },
                      { side: "front" as const, label: "Fronte" },
                      { side: "back" as const, label: "Retro" },
                    ] as const
                  ).map((item) => (
                    <label
                      key={item.side}
                      className="cursor-pointer rounded-full border border-white/20 px-3 py-1 text-[11px] text-white hover:border-leanme-fuchsia"
                    >
                      {uploadingKey === `${segment.id}-${item.side}`
                        ? "…"
                        : item.label}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            void onUpload(segment.id, item.side, file);
                          }
                          event.target.value = "";
                        }}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ))
      )}
    </LeonardoCollapsibleSection>
  );
}
