import path from "node:path";

import type { TenantEvent } from "@/types/lean-event";

import { createEntityBlobStore, isEntityBlobStorageEnabled } from "./entity-blob-storage";
import { readManagedEntity, readManagedEntityList } from "./entity-read";
import {
  deleteJsonFile,
  getDataRoot,
  listJsonFiles,
  readJsonFile,
  writeJsonFile,
} from "./storage";

const BLOB_ROOT = "lean-event/events";
const eventBlob = createEntityBlobStore(BLOB_ROOT);

export function getEventDir(tenantId: string): string {
  return path.join(getDataRoot(), "events", tenantId);
}

export function getEventFilePath(tenantId: string, eventId: string): string {
  return path.join(getEventDir(tenantId), `${eventId}.json`);
}

async function listEventsFromBlobOrFs(
  tenantId: string
): Promise<TenantEvent[]> {
  if (isEntityBlobStorageEnabled()) {
    return eventBlob.listAll<TenantEvent>(tenantId);
  }

  const dir = getEventDir(tenantId);
  const files = await listJsonFiles(dir);
  const events = await Promise.all(
    files.map((file) => readJsonFile<TenantEvent>(`${dir}/${file}`))
  );
  return events.filter((event): event is TenantEvent => Boolean(event));
}

async function getEventFromBlobOrFs(
  tenantId: string,
  eventId: string
): Promise<TenantEvent | null> {
  if (isEntityBlobStorageEnabled()) {
    return eventBlob.get<TenantEvent>(tenantId, eventId);
  }
  return readJsonFile<TenantEvent>(getEventFilePath(tenantId, eventId));
}

export async function listStoredEvents(
  tenantId: string
): Promise<TenantEvent[]> {
  return readManagedEntityList(tenantId, "event", () =>
    listEventsFromBlobOrFs(tenantId)
  );
}

export async function getStoredEvent(
  tenantId: string,
  eventId: string
): Promise<TenantEvent | null> {
  return readManagedEntity(tenantId, "event", eventId, () =>
    getEventFromBlobOrFs(tenantId, eventId)
  );
}

export async function saveStoredEvent(event: TenantEvent): Promise<void> {
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
