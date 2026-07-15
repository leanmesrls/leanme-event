import { parseAnyDateValue } from "@/lib/leanyou/dates";
import { formatContactName } from "@/lib/leanyou/contact-display";
import { formatVenueLabel } from "@/lib/leanyou/venue-display";
import type { LeanYouContact, LeonardoEvent, LeonardoVenue, LeonardoWorkspace } from "@/types/leanyou";

export type ListSortMode = "alphabetical" | "date_start" | "created_at";

export const LIST_SORT_OPTIONS: Array<{ value: ListSortMode; label: string }> = [
  { value: "alphabetical", label: "Ordine alfabetico" },
  { value: "date_start", label: "Data inizio evento" },
  { value: "created_at", label: "Data inserimento" },
];

export const LIST_SORT_OPTIONS_NO_EVENT_DATE: Array<{
  value: Exclude<ListSortMode, "date_start">;
  label: string;
}> = [
  { value: "alphabetical", label: "Ordine alfabetico" },
  { value: "created_at", label: "Data inserimento" },
];

function compareIsoDesc(a: string, b: string): number {
  return b.localeCompare(a);
}

export function sortEvents(
  events: LeonardoEvent[],
  mode: ListSortMode
): LeonardoEvent[] {
  const rows = [...events];
  if (mode === "alphabetical") {
    return rows.sort((a, b) => a.title.localeCompare(b.title, "it"));
  }
  if (mode === "date_start") {
    return rows.sort((a, b) => {
      const aDate = parseAnyDateValue(a.startDate)?.getTime() ?? 0;
      const bDate = parseAnyDateValue(b.startDate)?.getTime() ?? 0;
      if (aDate !== bDate) {
        return bDate - aDate;
      }
      return a.title.localeCompare(b.title, "it");
    });
  }
  return rows.sort((a, b) => compareIsoDesc(a.createdAt, b.createdAt));
}

export function sortContacts(
  contacts: LeanYouContact[],
  mode: Exclude<ListSortMode, "date_start">
): LeanYouContact[] {
  const rows = [...contacts];
  if (mode === "alphabetical") {
    return rows.sort((a, b) =>
      formatContactName(a).localeCompare(formatContactName(b), "it")
    );
  }
  return rows.sort((a, b) => compareIsoDesc(a.createdAt, b.createdAt));
}

export function sortVenues(
  venues: LeonardoVenue[],
  mode: Exclude<ListSortMode, "date_start">
): LeonardoVenue[] {
  const rows = [...venues];
  if (mode === "alphabetical") {
    return rows.sort((a, b) =>
      formatVenueLabel(a).localeCompare(formatVenueLabel(b), "it")
    );
  }
  return rows.sort((a, b) => compareIsoDesc(a.createdAt, b.createdAt));
}

export function sortWorkspaces(
  workspaces: LeonardoWorkspace[],
  mode: ListSortMode
): LeonardoWorkspace[] {
  const rows = [...workspaces];
  if (mode === "alphabetical") {
    return rows.sort((a, b) => a.title.localeCompare(b.title, "it"));
  }
  if (mode === "date_start") {
    return rows.sort((a, b) => {
      const aDate = parseAnyDateValue(a.meetingDate)?.getTime() ?? 0;
      const bDate = parseAnyDateValue(b.meetingDate)?.getTime() ?? 0;
      if (aDate !== bDate) {
        return bDate - aDate;
      }
      return a.title.localeCompare(b.title, "it");
    });
  }
  return rows.sort((a, b) => compareIsoDesc(a.createdAt, b.createdAt));
}

export function sortByContactName<T extends { contactName: string; createdAt: string }>(
  rows: T[],
  mode: Exclude<ListSortMode, "date_start">
): T[] {
  const copy = [...rows];
  if (mode === "alphabetical") {
    return copy.sort((a, b) =>
      a.contactName.localeCompare(b.contactName, "it")
    );
  }
  return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
