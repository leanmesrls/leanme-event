import path from "node:path";

import type { LeonardoVenue } from "@/types/leanyou";

import { createEntityBlobStore, isEntityBlobStorageEnabled } from "./entity-blob-storage";
import {
  deleteJsonFile,
  getDataRoot,
  listJsonFiles,
  readJsonFile,
  writeJsonFile,
} from "./storage";

const BLOB_ROOT = "leanyou/venues";
const venueBlob = createEntityBlobStore(BLOB_ROOT);

export function getVenueDir(tenantId: string): string {
  return path.join(getDataRoot(), "venues", tenantId);
}

export function getVenueFilePath(tenantId: string, venueId: string): string {
  return path.join(getVenueDir(tenantId), `${venueId}.json`);
}

export async function listStoredVenues(
  tenantId: string
): Promise<LeonardoVenue[]> {
  if (isEntityBlobStorageEnabled()) {
    return venueBlob.listAll<LeonardoVenue>(tenantId);
  }

  const dir = getVenueDir(tenantId);
  const files = await listJsonFiles(dir);
  const venues = await Promise.all(
    files.map((file) => readJsonFile<LeonardoVenue>(`${dir}/${file}`))
  );
  return venues.filter((venue): venue is LeonardoVenue => Boolean(venue));
}

export async function getStoredVenue(
  tenantId: string,
  venueId: string
): Promise<LeonardoVenue | null> {
  if (isEntityBlobStorageEnabled()) {
    return venueBlob.get<LeonardoVenue>(tenantId, venueId);
  }
  return readJsonFile<LeonardoVenue>(getVenueFilePath(tenantId, venueId));
}

export async function saveStoredVenue(venue: LeonardoVenue): Promise<void> {
  if (isEntityBlobStorageEnabled()) {
    await venueBlob.save(venue);
    return;
  }
  await writeJsonFile(getVenueFilePath(venue.tenantId, venue.id), venue);
}

export async function deleteStoredVenue(
  tenantId: string,
  venueId: string
): Promise<void> {
  if (isEntityBlobStorageEnabled()) {
    await venueBlob.delete(tenantId, venueId);
    return;
  }
  await deleteJsonFile(getVenueFilePath(tenantId, venueId));
}

export async function findVenueByIdentity(
  tenantId: string,
  identity: Pick<LeonardoVenue, "name" | "address" | "city">
): Promise<LeonardoVenue | null> {
  const key = venueIdentityKey(identity);
  const venues = await listStoredVenues(tenantId);
  return venues.find((venue) => venueIdentityKey(venue) === key) ?? null;
}

export function venueIdentityKey(
  venue: Pick<LeonardoVenue, "name" | "address" | "city">
): string {
  return [venue.name, venue.address, venue.city]
    .map((part) => part.trim().toLowerCase())
    .join("|");
}
