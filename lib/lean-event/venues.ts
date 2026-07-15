import { randomUUID } from "node:crypto";

import type { LeanEventSession, LeonardoVenue } from "@/types/lean-event";

import { normalizeVenue } from "./venue-normalize";
import {
  deleteStoredVenue,
  findVenueByIdentity,
  getStoredVenue,
  listStoredVenues,
  saveStoredVenue,
} from "./venue-storage";

export async function listVenues(tenantId: string): Promise<LeonardoVenue[]> {
  const venues = await listStoredVenues(tenantId);
  return venues
    .map((venue) => normalizeVenue(venue))
    .sort((a, b) =>
      `${a.city} ${a.name}`.localeCompare(`${b.city} ${b.name}`, "it")
    );
}

export async function getVenue(
  tenantId: string,
  venueId: string
): Promise<LeonardoVenue | null> {
  const venue = await getStoredVenue(tenantId, venueId);
  return venue ? normalizeVenue(venue) : null;
}

export async function saveVenue(venue: LeonardoVenue): Promise<void> {
  await saveStoredVenue(venue);
}

export async function deleteVenue(
  tenantId: string,
  venueId: string
): Promise<void> {
  await deleteStoredVenue(tenantId, venueId);
}

export async function findVenueByIdentityForTenant(
  tenantId: string,
  identity: Pick<LeonardoVenue, "name" | "address" | "city">
): Promise<LeonardoVenue | null> {
  return findVenueByIdentity(tenantId, identity);
}

export async function findVenueByExternalUrlForTenant(
  tenantId: string,
  externalUrl: string
): Promise<LeonardoVenue | null> {
  const normalized = externalUrl.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const venues = await listVenues(tenantId);
  return (
    venues.find(
      (venue) => venue.externalUrl.trim().toLowerCase() === normalized
    ) ?? null
  );
}

export function createVenue(
  session: LeanEventSession,
  input: {
    name: string;
    address: string;
    city: string;
    province: string;
    postalCode?: string;
    phone?: string;
    email?: string;
    website?: string;
    externalUrl?: string;
    coverImageUrl?: string;
    starCategory?: string;
    internalRating?: number;
    internalReview?: string;
    notes?: string;
  }
): LeonardoVenue {
  const now = new Date().toISOString();

  return normalizeVenue({
    id: randomUUID(),
    tenantId: session.tenantId,
    name: input.name.trim(),
    address: input.address.trim(),
    city: input.city.trim(),
    province: input.province.trim().toUpperCase(),
    postalCode: input.postalCode?.trim() ?? "",
    phone: input.phone?.trim() ?? "",
    email: input.email?.trim() ?? "",
    website: input.website?.trim() ?? "",
    externalUrl: input.externalUrl?.trim() ?? "",
    coverImageUrl: input.coverImageUrl?.trim() ?? "",
    starCategory: input.starCategory?.trim() ?? "",
    internalRating: 0,
    internalReview: "",
    notes: input.notes?.trim() ?? "",
    createdAt: now,
    updatedAt: now,
  });
}
