import type { LeonardoEventVenueDetails, LeonardoVenue } from "@/types/lean-event";

import {
  buildVenueSnapshot,
  buildVenueSnapshotFromDetails,
  emptyVenueDetails,
  normalizeVenueDetails,
  parseVenueSnapshotToDetails,
  venueDetailsFromLeonardoVenue,
} from "./venue-display";
import { getVenue } from "./venues";

export async function resolveEventVenueFields(
  tenantId: string,
  input: {
    venueId?: string | null;
    venue?: string;
    venueDetails?: Partial<LeonardoEventVenueDetails> | null;
  }
): Promise<{
  venueId: string | null;
  venue: string;
  venueDetails: LeonardoEventVenueDetails;
}> {
  const venueId = input.venueId?.trim() || null;
  const incomingDetails = input.venueDetails
    ? normalizeVenueDetails(input.venueDetails)
    : null;

  if (incomingDetails?.isOnline) {
    return {
      venueId: null,
      venue: buildVenueSnapshotFromDetails(incomingDetails),
      venueDetails: incomingDetails,
    };
  }

  if (venueId) {
    const linked = await getVenue(tenantId, venueId);
    if (linked) {
      const fromRubrica = venueDetailsFromLeonardoVenue(linked);
      // Se l’utente ha modificato i campi dopo la selezione, preserva override non vuoti
      const details = incomingDetails
        ? mergeVenueDetailsPreferIncoming(fromRubrica, incomingDetails)
        : fromRubrica;
      return {
        venueId,
        venue: buildVenueSnapshotFromDetails(details),
        venueDetails: details,
      };
    }
    const details =
      incomingDetails ??
      parseVenueSnapshotToDetails(input.venue?.trim() ?? "");
    return {
      venueId: null,
      venue: buildVenueSnapshotFromDetails(details) || (input.venue?.trim() ?? ""),
      venueDetails: details,
    };
  }

  if (incomingDetails) {
    const details = incomingDetails;
    const snapshot =
      buildVenueSnapshotFromDetails(details) || (input.venue?.trim() ?? "");
    return {
      venueId: null,
      venue: snapshot,
      venueDetails: details,
    };
  }

  const legacy = input.venue?.trim() ?? "";
  if (legacy) {
    const details = parseVenueSnapshotToDetails(legacy);
    return {
      venueId: null,
      venue: buildVenueSnapshotFromDetails(details) || legacy,
      venueDetails: details,
    };
  }

  return {
    venueId: null,
    venue: "",
    venueDetails: emptyVenueDetails(),
  };
}

function mergeVenueDetailsPreferIncoming(
  fromRubrica: LeonardoEventVenueDetails,
  incoming: LeonardoEventVenueDetails
): LeonardoEventVenueDetails {
  const stringEmpty = (value: unknown) =>
    typeof value !== "string" || !value.trim();
  const incomingEmpty =
    stringEmpty(incoming.name) &&
    stringEmpty(incoming.address) &&
    stringEmpty(incoming.city) &&
    stringEmpty(incoming.province) &&
    stringEmpty(incoming.region) &&
    stringEmpty(incoming.postalCode) &&
    stringEmpty(incoming.country) &&
    stringEmpty(incoming.onlineUrl) &&
    stringEmpty(incoming.notes) &&
    !incoming.isOnline;
  if (incomingEmpty) {
    return fromRubrica;
  }
  return {
    name: incoming.name || fromRubrica.name,
    address: incoming.address || fromRubrica.address,
    city: incoming.city || fromRubrica.city,
    province: incoming.province || fromRubrica.province,
    region: incoming.region || fromRubrica.region,
    postalCode: incoming.postalCode || fromRubrica.postalCode,
    country: incoming.country || fromRubrica.country,
    isOnline: incoming.isOnline ?? fromRubrica.isOnline,
    onlineUrl: incoming.onlineUrl || fromRubrica.onlineUrl,
    notes: incoming.notes || fromRubrica.notes,
  };
}

export function eventVenueDisplayLabel(
  venueSnapshot: string,
  linkedVenue?: LeonardoVenue | null,
  venueDetails?: LeonardoEventVenueDetails | null
): string {
  if (venueDetails) {
    const normalized = normalizeVenueDetails(venueDetails);
    if (
      normalized.isOnline ||
      Object.entries(normalized).some(([key, value]) => {
        if (key === "isOnline") {
          return Boolean(value);
        }
        return typeof value === "string" && value.trim().length > 0;
      })
    ) {
      return buildVenueSnapshotFromDetails(normalized);
    }
  }
  if (linkedVenue) {
    return buildVenueSnapshot(linkedVenue);
  }
  return venueSnapshot.trim() || "—";
}
