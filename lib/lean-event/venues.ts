import { randomUUID } from "node:crypto";

import type { LeanEventSession, LeonardoVenue } from "@/types/lean-event";

import {
  assertRevisionMatch,
  isEntityActive,
  markEntityDeleted,
  markEntityRestored,
  prepareEntityCreate,
  prepareEntityUpdate,
  sessionUserId,
  withLifecycleDefaults,
} from "./entity-lifecycle";
import { normalizeVenue } from "./venue-normalize";
import {
  findVenueByIdentity,
  getStoredVenue,
  listStoredVenues,
  saveStoredVenue,
} from "./venue-storage";
import { upsertManagedEntityToNeon } from "./entity-db";
import { saveEntityVersionSnapshot } from "./version-storage";
import {
  auditManagedEntityMutation,
  resolveEntityAuditAction,
} from "./audit-log";

function normalizeStoredVenue(venue: LeonardoVenue): LeonardoVenue {
  return normalizeVenue(withLifecycleDefaults(venue) as LeonardoVenue);
}

export async function listVenues(tenantId: string): Promise<LeonardoVenue[]> {
  const venues = await listStoredVenues(tenantId);
  return venues
    .map((venue) => normalizeStoredVenue(venue))
    .filter(isEntityActive)
    .sort((a, b) =>
      `${a.city} ${a.name}`.localeCompare(`${b.city} ${b.name}`, "it")
    );
}

export async function listDeletedVenues(
  tenantId: string
): Promise<LeonardoVenue[]> {
  const venues = await listStoredVenues(tenantId);
  return venues
    .map((venue) => normalizeStoredVenue(venue))
    .filter((venue) => !isEntityActive(venue))
    .sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""));
}

export async function getVenue(
  tenantId: string,
  venueId: string,
  options?: { includeDeleted?: boolean }
): Promise<LeonardoVenue | null> {
  const venue = await getStoredVenue(tenantId, venueId);
  if (!venue) {
    return null;
  }
  const normalized = normalizeStoredVenue(venue);
  if (!options?.includeDeleted && !isEntityActive(normalized)) {
    return null;
  }
  return normalized;
}

async function persistVenue(
  venue: LeonardoVenue,
  previous: LeonardoVenue | null
): Promise<void> {
  if (previous) {
    await saveEntityVersionSnapshot(
      venue.tenantId,
      "venue",
      venue.id,
      previous.revision ?? 1,
      previous
    );
  }
  await saveStoredVenue(venue);
  await upsertManagedEntityToNeon("venue", venue);
  await auditManagedEntityMutation({
    tenantId: venue.tenantId,
    entityType: "venue",
    entityId: venue.id,
    action: resolveEntityAuditAction(previous, venue),
    userId: venue.updatedBy,
  });
}

export async function saveVenue(
  venue: LeonardoVenue,
  options?: {
    expectedRevision?: number;
    userId?: string;
    previous?: LeonardoVenue | null;
  }
): Promise<LeonardoVenue> {
  const normalized = normalizeStoredVenue(venue);
  const previous =
    options?.previous ??
    (await getStoredVenue(normalized.tenantId, normalized.id));

  if (previous) {
    const prevNorm = normalizeStoredVenue(previous);
    assertRevisionMatch(prevNorm, options?.expectedRevision);
    const userId = options?.userId ?? normalized.updatedBy ?? "system";
    const next = prepareEntityUpdate(prevNorm, userId);
    const merged = normalizeStoredVenue({
      ...normalized,
      revision: next.revision,
      updatedAt: next.updatedAt!,
      updatedBy: next.updatedBy,
    });
    await persistVenue(merged, prevNorm);
    return merged;
  }

  await persistVenue(normalized, null);
  return normalized;
}

export async function deleteVenue(
  tenantId: string,
  venueId: string,
  userId: string
): Promise<void> {
  const venue = await getVenue(tenantId, venueId, { includeDeleted: true });
  if (!venue) {
    return;
  }
  const deleted = markEntityDeleted(venue, userId);
  await persistVenue(deleted, venue);
}

export async function restoreVenue(
  tenantId: string,
  venueId: string,
  userId: string
): Promise<LeonardoVenue | null> {
  const venue = await getVenue(tenantId, venueId, { includeDeleted: true });
  if (!venue || isEntityActive(venue)) {
    return null;
  }
  const restored = markEntityRestored(venue, userId);
  await persistVenue(restored, venue);
  return restored;
}


export async function findVenueByIdentityForTenant(
  tenantId: string,
  identity: Pick<LeonardoVenue, "name" | "address" | "city">
): Promise<LeonardoVenue | null> {
  const venue = await findVenueByIdentity(tenantId, identity);
  return venue && isEntityActive(normalizeStoredVenue(venue))
    ? normalizeStoredVenue(venue)
    : null;
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
  const userId = sessionUserId(session);

  const draft: LeonardoVenue = {
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
    internalReview: input.internalReview?.trim() ?? "",
    notes: input.notes?.trim() ?? "",
    createdAt: now,
    updatedAt: now,
  };

  return prepareEntityCreate(normalizeStoredVenue(draft), userId);
}
