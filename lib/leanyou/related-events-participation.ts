import type {
  LeonardoRelatedEvent,
  LeonardoRelatedEventCompanion,
  LeonardoRelatedEventParticipation,
  LeonardoRelatedEventParticipationStatus,
} from "@/types/leanyou";

import {
  formatCompanionName,
  hasCompanionIdentity,
  normalizeCompanionPerson,
} from "./companion";

export function normalizeRelatedEventCompanion(
  value?: Partial<LeonardoRelatedEventCompanion> | null
): LeonardoRelatedEventCompanion {
  const person = normalizeCompanionPerson(value ?? undefined);
  return {
    ...person,
    contactId: value?.contactId ?? null,
  };
}

export function normalizeParticipationCompanions(
  participation: Partial<LeonardoRelatedEventParticipation> | undefined,
  maxCount: number
): LeonardoRelatedEventCompanion[] {
  const limit = Math.max(0, maxCount);
  if (limit === 0) {
    return [];
  }

  let source = participation?.companions?.map((item) =>
    normalizeRelatedEventCompanion(item)
  );

  if (!source?.length && participation?.companion) {
    source = [normalizeRelatedEventCompanion(participation.companion)];
  }

  const filled = (source ?? []).filter((item) => hasCompanionIdentity(item));
  const slots: LeonardoRelatedEventCompanion[] = [];
  for (let index = 0; index < limit; index += 1) {
    slots.push(
      normalizeRelatedEventCompanion(filled[index] ?? { contactId: null })
    );
  }
  return slots;
}

export function countFilledCompanions(
  companions: LeonardoRelatedEventCompanion[] | undefined
): number {
  return (companions ?? []).filter((item) => hasCompanionIdentity(item)).length;
}

export function summarizeRelatedParticipations(
  relatedEvents: LeonardoRelatedEvent[],
  participations: LeonardoRelatedEventParticipation[]
): string {
  if (relatedEvents.length === 0) {
    return "Nessuna attività";
  }

  const confirmed = participations.filter(
    (item) => item.status === "confirmed"
  ).length;
  const pending = participations.filter((item) => item.status === "pending").length;
  const declined = participations.filter(
    (item) => item.status === "declined"
  ).length;

  const parts = [`${relatedEvents.length} attività`];
  if (confirmed > 0) {
    parts.push(`${confirmed} confermati`);
  }
  if (pending > 0) {
    parts.push(`${pending} da confermare`);
  }
  if (declined > 0) {
    parts.push(`${declined} assenti`);
  }
  return parts.join(" · ");
}

export function summarizeParticipationCompanions(
  companions: LeonardoRelatedEventCompanion[] | undefined
): string {
  const names = (companions ?? [])
    .map((item) => formatCompanionName(item))
    .filter(Boolean);
  if (names.length === 0) {
    return "";
  }
  return names.join(", ");
}

export function participationStatusLabel(
  status: LeonardoRelatedEventParticipationStatus
): string {
  switch (status) {
    case "confirmed":
      return "Confermato";
    case "declined":
      return "Non partecipa";
    default:
      return "Da confermare";
  }
}
