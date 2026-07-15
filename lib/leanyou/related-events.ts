import type {
  LeonardoRelatedEvent,
  LeonardoRelatedEventKind,
  LeonardoRelatedEventParticipation,
  LeonardoRelatedEventParticipationStatus,
} from "@/types/leanyou";

import {
  normalizeParticipationCompanions,
} from "./related-events-participation";

export const RELATED_EVENT_KIND_LABELS: Record<
  LeonardoRelatedEventKind,
  string
> = {
  cena_gala: "Cena di gala",
  cena_relatore: "Cena relatori",
  attivita_extra: "Attività extra",
  altro: "Altro",
};

export const RELATED_EVENT_PARTICIPATION_STATUS_LABELS: Record<
  LeonardoRelatedEventParticipationStatus,
  string
> = {
  pending: "Da confermare",
  confirmed: "Confermato",
  declined: "Non partecipa",
};

export function emptyRelatedEvent(
  partial?: Partial<LeonardoRelatedEvent>
): LeonardoRelatedEvent {
  return {
    id: partial?.id ?? "",
    kind: partial?.kind ?? "attivita_extra",
    title: partial?.title?.trim() ?? "",
    startsAt: partial?.startsAt?.trim() ?? "",
    endsAt: partial?.endsAt?.trim() ?? "",
    venue: partial?.venue?.trim() ?? "",
    venueId: partial?.venueId ?? null,
    notes: partial?.notes?.trim() ?? "",
    companionsAllowed: partial?.companionsAllowed ?? true,
    maxCompanionsPerGuest:
      typeof partial?.maxCompanionsPerGuest === "number"
        ? Math.max(0, partial.maxCompanionsPerGuest)
        : 1,
  };
}

export function normalizeRelatedEvent(
  event: Partial<LeonardoRelatedEvent>
): LeonardoRelatedEvent {
  const base = emptyRelatedEvent(event);
  return {
    ...base,
    ...event,
    title: event.title?.trim() ?? base.title,
    startsAt: event.startsAt?.trim() ?? "",
    endsAt: event.endsAt?.trim() ?? "",
    venue: event.venue?.trim() ?? "",
    venueId: event.venueId ?? null,
    notes: event.notes?.trim() ?? "",
    companionsAllowed: Boolean(event.companionsAllowed ?? base.companionsAllowed),
    maxCompanionsPerGuest: Math.max(
      0,
      event.maxCompanionsPerGuest ?? base.maxCompanionsPerGuest
    ),
  };
}

export function normalizeRelatedEvents(
  events?: LeonardoRelatedEvent[] | null
): LeonardoRelatedEvent[] {
  if (!events?.length) {
    return [];
  }
  return events.map((item) => normalizeRelatedEvent(item));
}

export function emptyRelatedParticipation(
  relatedEventId: string,
  relatedEvent: Pick<LeonardoRelatedEvent, "companionsAllowed" | "maxCompanionsPerGuest">,
  partial?: Partial<LeonardoRelatedEventParticipation>
): LeonardoRelatedEventParticipation {
  const maxCount =
    relatedEvent.companionsAllowed && relatedEvent.maxCompanionsPerGuest > 0
      ? relatedEvent.maxCompanionsPerGuest
      : 0;

  return {
    relatedEventId,
    status: partial?.status ?? "pending",
    notes: partial?.notes?.trim() ?? "",
    companions: normalizeParticipationCompanions(partial, maxCount),
  };
}

export function normalizeRelatedParticipations(
  relatedEvents: LeonardoRelatedEvent[],
  participations?: LeonardoRelatedEventParticipation[] | null
): LeonardoRelatedEventParticipation[] {
  const byId = new Map(
    (participations ?? []).map((item) => [item.relatedEventId, item])
  );

  return relatedEvents.map((relatedEvent) => {
    const existing = byId.get(relatedEvent.id);
    return emptyRelatedParticipation(relatedEvent.id, relatedEvent, existing);
  });
}

export function formatRelatedEventSummary(event: LeonardoRelatedEvent): string {
  const kind = RELATED_EVENT_KIND_LABELS[event.kind] ?? event.kind;
  return event.title.trim() ? `${kind} · ${event.title.trim()}` : kind;
}
