import path from "node:path";

import type { LeonardoEventChatThread } from "@/types/lean-event";

import { createEntityBlobStore, isEntityBlobStorageEnabled } from "./entity-blob-storage";
import { readManagedEntity, readManagedEntityList } from "./entity-read";
import {
  deleteJsonFile,
  getDataRoot,
  listJsonFiles,
  readJsonFile,
  writeJsonFile,
} from "./storage";

const BLOB_ROOT = "lean-event/event-chats";
const chatBlob = createEntityBlobStore(BLOB_ROOT);

export function getEventChatDir(tenantId: string): string {
  return path.join(getDataRoot(), "event-chats", tenantId);
}

export function getEventChatFilePath(
  tenantId: string,
  eventId: string
): string {
  return path.join(getEventChatDir(tenantId), `${eventId}.json`);
}

/** Legacy path used before Neon/Blob dual-write. */
export function getLegacyEventChatFilePath(
  tenantId: string,
  eventId: string
): string {
  return path.join(getDataRoot(), "events", tenantId, `${eventId}-chat.json`);
}

async function listChatsFromBlobOrFs(
  tenantId: string
): Promise<LeonardoEventChatThread[]> {
  if (isEntityBlobStorageEnabled()) {
    return chatBlob.listAll<LeonardoEventChatThread>(tenantId);
  }

  const dir = getEventChatDir(tenantId);
  const files = await listJsonFiles(dir);
  const threads = await Promise.all(
    files.map((file) =>
      readJsonFile<LeonardoEventChatThread>(`${dir}/${file}`)
    )
  );
  return threads.filter(
    (thread): thread is LeonardoEventChatThread => Boolean(thread)
  );
}

async function getChatFromBlobOrFs(
  tenantId: string,
  eventId: string
): Promise<LeonardoEventChatThread | null> {
  if (isEntityBlobStorageEnabled()) {
    const fromBlob = await chatBlob.get<LeonardoEventChatThread>(
      tenantId,
      eventId
    );
    if (fromBlob) {
      return fromBlob;
    }
  } else {
    const fromFs = await readJsonFile<LeonardoEventChatThread>(
      getEventChatFilePath(tenantId, eventId)
    );
    if (fromFs) {
      return fromFs;
    }
  }

  // Migrazione lazy da path legacy FS
  const legacy = await readJsonFile<
    LeonardoEventChatThread["messages"] | LeonardoEventChatThread
  >(getLegacyEventChatFilePath(tenantId, eventId));
  if (!legacy) {
    return null;
  }
  if (Array.isArray(legacy)) {
    const now = new Date().toISOString();
    return {
      id: eventId,
      tenantId,
      eventId,
      messages: legacy,
      createdAt: legacy[0]?.createdAt ?? now,
      updatedAt: legacy[legacy.length - 1]?.createdAt ?? now,
      revision: 1,
      deletedAt: null,
      deletedBy: null,
      purgeAfter: null,
    };
  }
  return legacy;
}

export async function listStoredEventChatThreads(
  tenantId: string
): Promise<LeonardoEventChatThread[]> {
  return readManagedEntityList(tenantId, "event_chat", () =>
    listChatsFromBlobOrFs(tenantId)
  );
}

export async function getStoredEventChatThread(
  tenantId: string,
  eventId: string
): Promise<LeonardoEventChatThread | null> {
  return readManagedEntity(tenantId, "event_chat", eventId, () =>
    getChatFromBlobOrFs(tenantId, eventId)
  );
}

export async function saveStoredEventChatThread(
  thread: LeonardoEventChatThread
): Promise<void> {
  if (isEntityBlobStorageEnabled()) {
    await chatBlob.save(thread);
    return;
  }
  await writeJsonFile(
    getEventChatFilePath(thread.tenantId, thread.id),
    thread
  );
}

export async function deleteStoredEventChatThread(
  tenantId: string,
  eventId: string
): Promise<void> {
  if (isEntityBlobStorageEnabled()) {
    await chatBlob.delete(tenantId, eventId);
    return;
  }
  await deleteJsonFile(getEventChatFilePath(tenantId, eventId));
}
