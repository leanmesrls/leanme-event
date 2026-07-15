"use client";

import { LeonardoCollapsibleSection } from "@/components/lean-event/LeonardoCollapsibleSection";
import {
  LeonardoCompanionFields,
  emptyCompanionFieldValue,
  type CompanionFieldValue,
} from "@/components/lean-event/LeonardoCompanionFields";
import {
  countFilledCompanions,
  participationStatusLabel,
  summarizeParticipationCompanions,
} from "@/lib/lean-event/related-events-participation";
import {
  formatRelatedEventSummary,
  RELATED_EVENT_PARTICIPATION_STATUS_LABELS,
} from "@/lib/lean-event/related-events";
import type {
  LeanEventContact,
  LeonardoRelatedEvent,
  LeonardoRelatedEventCompanion,
  LeonardoRelatedEventParticipation,
  LeonardoRelatedEventParticipationStatus,
} from "@/types/lean-event";

interface ParticipantOption {
  id: string;
  label: string;
  contact: LeanEventContact;
}

interface LeonardoGuestRelatedEventsSectionProps {
  open: boolean;
  onToggle: () => void;
  summary: string;
  relatedEvents: LeonardoRelatedEvent[];
  participations: LeonardoRelatedEventParticipation[];
  participantOptions: ParticipantOption[];
  onChange: (participations: LeonardoRelatedEventParticipation[]) => void;
}

export function LeonardoGuestRelatedEventsSection({
  open,
  onToggle,
  summary,
  relatedEvents,
  participations,
  participantOptions,
  onChange,
}: LeonardoGuestRelatedEventsSectionProps) {
  if (relatedEvents.length === 0) {
    return null;
  }

  function updateParticipation(
    relatedEventId: string,
    patch: Partial<LeonardoRelatedEventParticipation>
  ) {
    onChange(
      participations.map((item) =>
        item.relatedEventId === relatedEventId ? { ...item, ...patch } : item
      )
    );
  }

  function updateCompanion(
    relatedEventId: string,
    index: number,
    companion: CompanionFieldValue
  ) {
    const participation = participations.find(
      (item) => item.relatedEventId === relatedEventId
    );
    if (!participation) {
      return;
    }

    const nextCompanions = [...participation.companions];
    nextCompanions[index] = {
      firstName: companion.firstName,
      lastName: companion.lastName,
      phone: companion.phone,
      email: companion.email,
      contactId: companion.contactId,
    };

    updateParticipation(relatedEventId, { companions: nextCompanions });
  }

  return (
    <LeonardoCollapsibleSection
      title={`Eventi correlati (${summary})`}
      open={open}
      onToggle={onToggle}
    >
      <div className="space-y-2">
          {relatedEvents.map((relatedEvent) => {
            const participation =
              participations.find(
                (item) => item.relatedEventId === relatedEvent.id
              ) ??
              ({
                relatedEventId: relatedEvent.id,
                status: "pending",
                notes: "",
                companions: [],
              } satisfies LeonardoRelatedEventParticipation);

            const maxCompanions =
              relatedEvent.companionsAllowed && participation.status !== "declined"
                ? Math.max(0, relatedEvent.maxCompanionsPerGuest)
                : 0;

            const companionSummary = summarizeParticipationCompanions(
              participation.companions
            );

            return (
              <details
                key={relatedEvent.id}
                className="rounded-lg border border-white/10 bg-[#0a0a0a] p-2"
              >
                <summary className="cursor-pointer list-none px-1 py-1">
                  <span className="block truncate text-sm font-medium text-leanme-fuchsia">
                    {formatRelatedEventSummary(relatedEvent)}
                  </span>
                  <span className="mt-0.5 block text-xs text-white/45">
                    {participationStatusLabel(participation.status)}
                    {companionSummary ? ` · ${companionSummary}` : ""}
                  </span>
                </summary>

                <div className="mt-2 space-y-2 border-t border-white/10 pt-2">
                  {relatedEvent.startsAt ? (
                    <p className="text-xs text-white/45">
                      {relatedEvent.startsAt}
                      {relatedEvent.venue ? ` · ${relatedEvent.venue}` : ""}
                    </p>
                  ) : null}

                  <label className="block text-sm">
                    <span className="mb-1 block text-white/60">Partecipazione</span>
                    <select
                      value={participation.status}
                      onChange={(event) => {
                        const status = event.target
                          .value as LeonardoRelatedEventParticipationStatus;
                        updateParticipation(relatedEvent.id, {
                          status,
                          companions:
                            status === "declined"
                              ? participation.companions.map((item) => ({
                                  ...item,
                                  firstName: "",
                                  lastName: "",
                                  phone: "",
                                  email: "",
                                  contactId: null,
                                }))
                              : participation.companions,
                        });
                      }}
                      className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
                    >
                      {Object.entries(RELATED_EVENT_PARTICIPATION_STATUS_LABELS).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  {maxCompanions > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-white/45">
                        Accompagnatori ({countFilledCompanions(participation.companions)}/
                        {maxCompanions})
                      </p>
                      {Array.from({ length: maxCompanions }).map((_, index) => {
                        const companion =
                          participation.companions[index] ??
                          ({
                            firstName: "",
                            lastName: "",
                            phone: "",
                            email: "",
                            contactId: null,
                          } satisfies LeonardoRelatedEventCompanion);

                        return (
                          <LeonardoCompanionFields
                            key={`${relatedEvent.id}-${index}`}
                            title={`Accompagnatore ${index + 1}`}
                            value={emptyCompanionFieldValue({
                              ...companion,
                              contactId: companion.contactId ?? null,
                            })}
                            participantOptions={participantOptions}
                            onChange={(value) =>
                              updateCompanion(relatedEvent.id, index, value)
                            }
                          />
                        );
                      })}
                    </div>
                  ) : null}

                  <textarea
                    rows={2}
                    value={participation.notes}
                    onChange={(event) =>
                      updateParticipation(relatedEvent.id, {
                        notes: event.target.value,
                      })
                    }
                    placeholder="Note (tavolo, bus…)"
                    className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
                  />
                </div>
              </details>
            );
          })}
        </div>
    </LeonardoCollapsibleSection>
  );
}
