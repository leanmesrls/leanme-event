import type { LeonardoVenue } from "@/types/lean-event";

export function formatVenueLabel(venue: LeonardoVenue): string {
  const province = venue.province.trim();
  return province
    ? `${venue.name} — ${venue.city}, ${province}`
    : `${venue.name} — ${venue.city}`;
}

export function buildVenueSnapshot(venue: LeonardoVenue): string {
  const parts = [venue.name, venue.address, venue.city, venue.province].filter(Boolean);
  return parts.join(" · ");
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
    venue.postalCode,
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
