import { randomUUID } from "node:crypto";

import type {
  LeanEventSession,
  TenantEventChatMessage,
  LeonardoEventChatThread,
} from "@/types/lean-event";

import {
  auditManagedEntityMutation,
  resolveEntityAuditAction,
} from "./audit-log";
import { upsertManagedEntityToNeon } from "./entity-db";
import {
  isEntityActive,
  prepareEntityCreate,
  prepareEntityUpdate,
  sessionUserId,
  withLifecycleDefaults,
} from "./entity-lifecycle";
import { getEvent } from "./events";
import {
  getStoredEventChatThread,
  saveStoredEventChatThread,
} from "./event-chat-storage";
import { saveEntityVersionSnapshot } from "./version-storage";

function normalizeThread(
  thread: LeonardoEventChatThread
): LeonardoEventChatThread {
  return withLifecycleDefaults({
    ...thread,
    messages: thread.messages ?? [],
  }) as LeonardoEventChatThread;
}

async function persistThread(
  thread: LeonardoEventChatThread,
  previous: LeonardoEventChatThread | null
): Promise<void> {
  if (previous) {
    await saveEntityVersionSnapshot(
      thread.tenantId,
      "event_chat",
      thread.id,
      previous.revision ?? 1,
      previous
    );
  }
  await saveStoredEventChatThread(thread);
  await upsertManagedEntityToNeon("event_chat", thread);
  await auditManagedEntityMutation({
    tenantId: thread.tenantId,
    entityType: "event_chat",
    entityId: thread.id,
    action: resolveEntityAuditAction(previous, thread),
    userId: thread.updatedBy,
  });
}

export async function listEventChatMessages(
  tenantId: string,
  eventId: string
): Promise<TenantEventChatMessage[]> {
  const thread = await getStoredEventChatThread(tenantId, eventId);
  if (!thread || !isEntityActive(normalizeThread(thread))) {
    return [];
  }
  return [...normalizeThread(thread).messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export async function appendEventChatMessage(
  session: LeanEventSession,
  eventId: string,
  input: {
    body: string;
    links?: TenantEventChatMessage["links"];
    mentions?: string[];
    attachments?: TenantEventChatMessage["attachments"];
  }
): Promise<TenantEventChatMessage> {
  const event = await getEvent(session.tenantId, eventId);
  if (!event) {
    throw new Error("EVENT_NOT_FOUND");
  }

  const body = input.body.trim();
  if (!body && !(input.attachments?.length ?? 0)) {
    throw new Error("EMPTY_MESSAGE");
  }

  const message: TenantEventChatMessage = {
    id: randomUUID(),
    eventId,
    tenantId: session.tenantId,
    authorUserId: session.userId,
    authorName: session.userName,
    authorEmail: session.userEmail,
    body,
    links: input.links?.length ? input.links : undefined,
    mentions: input.mentions?.length ? input.mentions : undefined,
    attachments: input.attachments?.length ? input.attachments : undefined,
    createdAt: new Date().toISOString(),
  };

  const userId = sessionUserId(session);
  const existing = await getStoredEventChatThread(session.tenantId, eventId);
  const previous = existing ? normalizeThread(existing) : null;

  if (previous && isEntityActive(previous)) {
    const nextMeta = prepareEntityUpdate(previous, userId);
    const next = normalizeThread({
      ...previous,
      messages: [...previous.messages, message],
      revision: nextMeta.revision,
      updatedAt: nextMeta.updatedAt!,
      updatedBy: nextMeta.updatedBy,
    });
    await persistThread(next, previous);
    return message;
  }

  const now = message.createdAt;
  const draft: LeonardoEventChatThread = {
    id: eventId,
    tenantId: session.tenantId,
    eventId,
    messages: [message],
    createdAt: now,
    updatedAt: now,
  };
  const created = normalizeThread(prepareEntityCreate(draft, userId));
  await persistThread(created, null);
  return message;
}

export function extractMentions(text: string): string[] {
  const matches = text.match(/@[\w.+-]+@[\w.-]+\.\w+|@[\w.-]+/g) ?? [];
  return [
    ...new Set(matches.map((item) => item.slice(1).trim()).filter(Boolean)),
  ];
}
