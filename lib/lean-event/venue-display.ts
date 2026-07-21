import type {
  LeonardoEventVenueDetails,
  LeonardoVenue,
} from "@/types/lean-event";

import {
  DEFAULT_COUNTRY,
  normalizeAddressFields,
  regionFromItalianProvince,
} from "./geo-italy";

export function emptyVenueDetails(): LeonardoEventVenueDetails {
  return {
    name: "",
    address: "",
    city: "",
    province: "",
    region: "",
    postalCode: "",
    country: DEFAULT_COUNTRY,
    isOnline: false,
    onlineUrl: "",
    notes: "",
  };
}

export function normalizeVenueDetails(
  details?: Partial<LeonardoEventVenueDetails> | null
): LeonardoEventVenueDetails {
  const isOnline = Boolean(details?.isOnline);
  if (isOnline) {
    return {
      name: "ONLINE",
      address: "",
      city: "",
      province: "",
      region: "",
      postalCode: "",
      country: "",
      isOnline: true,
      onlineUrl: details?.onlineUrl?.trim() ?? "",
      notes: details?.notes?.trim() ?? "",
    };
  }

  const address = normalizeAddressFields({
    address: details?.address,
    city: details?.city,
    province: details?.province,
    region: details?.region,
    postalCode: details?.postalCode,
    country: details?.country,
  });
  return {
    name: details?.name?.trim() ?? "",
    ...address,
    isOnline: false,
    onlineUrl: "",
    notes: details?.notes?.trim() ?? "",
  };
}

export function venueDetailsFromLeonardoVenue(
  venue: LeonardoVenue
): LeonardoEventVenueDetails {
  return normalizeVenueDetails({
    name: venue.name,
    address: venue.address,
    city: venue.city,
    province: venue.province,
    region: venue.region || regionFromItalianProvince(venue.province),
    postalCode: venue.postalCode,
    country: venue.country || DEFAULT_COUNTRY,
    notes: venue.notes,
  });
}

export function buildVenueSnapshotFromDetails(
  details: LeonardoEventVenueDetails
): string {
  const normalized = normalizeVenueDetails(details);
  if (normalized.isOnline) {
    const parts = [
      "ONLINE",
      (normalized.onlineUrl ?? "").trim(),
      normalized.notes.trim(),
    ].filter(Boolean);
    return parts.join(" · ");
  }
  const location = [
    normalized.address,
    normalized.city,
    normalized.province,
    normalized.region,
    normalized.postalCode,
    normalized.country,
  ]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(", ");
  const parts = [normalized.name.trim(), location, normalized.notes.trim()].filter(
    Boolean
  );
  return parts.join(" · ");
}

export function formatVenueLabel(venue: LeonardoVenue): string {
  const province = venue.province.trim();
  return province
    ? `${venue.name} — ${venue.city}, ${province}`
    : `${venue.name} — ${venue.city}`;
}

export function buildVenueSnapshot(venue: LeonardoVenue): string {
  return buildVenueSnapshotFromDetails(venueDetailsFromLeonardoVenue(venue));
}

/** URL same-origin per proxy immagine (evita blocchi COEP su link esterni). */
export function resolveVenueCoverSrc(
  venue: Pick<LeonardoVenue, "id" | "coverImageUrl">
): string | null {
  if (!venue.coverImageUrl?.trim()) {
    return null;
  }
  return `/api/lean-event/venues/${venue.id}/cover`;
}

export function venueMatchesQuery(venue: LeonardoVenue, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const haystack = [
    venue.name,
    venue.address,
    venue.city,
    venue.province,
    venue.region,
    venue.postalCode,
    venue.country,
    venue.phone,
    venue.email,
    venue.starCategory,
    venue.internalReview,
    venue.notes,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

/** Prova a ricostruire i campi se esiste solo lo snapshot testuale legacy. */
export function parseVenueSnapshotToDetails(
  snapshot: string
): LeonardoEventVenueDetails {
  const trimmed = snapshot.trim();
  if (!trimmed) {
    return emptyVenueDetails();
  }
  const parts = trimmed.split(" · ").map((part) => part.trim()).filter(Boolean);
  if (parts[0]?.toUpperCase() === "ONLINE") {
    return normalizeVenueDetails({
      isOnline: true,
      onlineUrl: parts[1] ?? "",
      notes: parts.slice(2).join(" · "),
    });
  }
  if (parts.length >= 3) {
    return normalizeVenueDetails({
      name: parts[0],
      address: parts[1],
      city: parts[2],
      province: parts[3] ?? "",
      postalCode: parts[4] ?? "",
      notes: parts.slice(5).join(" · "),
    });
  }
  if (parts.length === 2) {
    return normalizeVenueDetails({
      name: parts[0],
      address: parts[1],
    });
  }
  return normalizeVenueDetails({ name: trimmed });
}
