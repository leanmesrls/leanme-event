import type { LeonardoVenue } from "@/types/lean-event";

import { DEFAULT_COUNTRY, normalizeAddressFields } from "./geo-italy";

function extractStarCategoryFromNotes(notes: string): string {
  const match = notes.match(/Categoria:\s*([^·]+)/i);
  return match?.[1]?.trim() ?? "";
}

export function normalizeVenue(venue: LeonardoVenue): LeonardoVenue {
  const notes = venue.notes ?? "";
  const starCategory =
    venue.starCategory?.trim() || extractStarCategoryFromNotes(notes);
  const address = normalizeAddressFields({
    address: venue.address,
    city: venue.city,
    province: venue.province,
    region: venue.region,
    postalCode: venue.postalCode,
    country: venue.country || DEFAULT_COUNTRY,
  });

  return {
    ...venue,
    ...address,
    externalUrl: venue.externalUrl ?? "",
    coverImageUrl: venue.coverImageUrl ?? "",
    website: venue.website ?? "",
    starCategory,
    internalRating: clampInternalRating(venue.internalRating),
    internalReview: venue.internalReview?.trim() ?? "",
    notes,
  };
}

export function clampInternalRating(value: unknown): number {
  const rating = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(rating)) {
    return 0;
  }
  return Math.min(5, Math.max(0, Math.round(rating)));
}

export function isMeetingCongressiUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.hostname.includes("meetingecongressi.com");
  } catch {
    return false;
  }
}

export function parseStarCount(starCategory: string): number | null {
  const match = starCategory.match(/(\d+(?:[.,]\d+)?)\s*stelle/i);
  if (!match?.[1]) {
    return null;
  }
  return Number.parseFloat(match[1].replace(",", "."));
}

export function formatStarCategoryLabel(starCategory: string): string {
  const value = starCategory.trim();
  return value || "—";
}

export function formatInternalRatingLabel(rating: number): string {
  if (rating <= 0) {
    return "—";
  }
  return `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`;
}
