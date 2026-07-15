import path from "node:path";

import type { LeonardoEvent } from "@/types/leanyou";

import { createEntityBlobStore, isEntityBlobStorageEnabled } from "./entity-blob-storage";
import {
  deleteJsonFile,
  getDataRoot,
  listJsonFiles,
  readJsonFile,
  writeJsonFile,
} from "./storage";

const BLOB_ROOT = "leanyou/events";
const eventBlob = createEntityBlobStore(BLOB_ROOT);

export function getEventDir(tenantId: string): string {
  return path.join(getDataRoot(), "events", tenantId);
}

export function getEventFilePath(tenantId: string, eventId: string): string {
  return path.join(getEventDir(tenantId), `${eventId}.json`);
}

export async function listStoredEvents(
  tenantId: string
): Promise<LeonardoEvent[]> {
  if (isEntityBlobStorageEnabled()) {
    return eventBlob.listAll<LeonardoEvent>(tenantId);
  }

  const dir = getEventDir(tenantId);
  const files = await listJsonFiles(dir);
  const events = await Promise.all(
    files.map((file) => readJsonFile<LeonardoEvent>(`${dir}/${file}`))
  );
  return events.filter((event): event is LeonardoEvent => Boolean(event));
}

export async function getStoredEvent(
  tenantId: string,
  eventId: string
): Promise<LeonardoEvent | null> {
  if (isEntityBlobStorageEnabled()) {
    return eventBlob.get<LeonardoEvent>(tenantId, eventId);
  }
  return readJsonFile<LeonardoEvent>(getEventFilePath(tenantId, eventId));
}

export async function saveStoredEvent(event: LeonardoEvent): Promise<void> {
  if (isEntityBlobStorageEnabled()) {
    await eventBlob.save(event);
    return;
  }
  await writeJsonFile(getEventFilePath(event.tenantId, event.id), event);
}

export async function deleteStoredEvent(
  tenantId: string,
  eventId: string
): Promise<void> {
  if (isEntityBlobStorageEnabled()) {
    await eventBlob.delete(tenantId, eventId);
    return;
  }
  await deleteJsonFile(getEventFilePath(tenantId, eventId));
}
