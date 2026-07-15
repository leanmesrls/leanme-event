import { randomUUID } from "node:crypto";
import path from "node:path";

import type {
  LeanEventSession,
  LeonardoEventChatMessage,
} from "@/types/lean-event";

import { getEvent } from "./events";
import { readJsonFile, writeJsonFile, getDataRoot } from "./storage";

function getChatFilePath(tenantId: string, eventId: string): string {
  return path.join(getDataRoot(), "events", tenantId, `${eventId}-chat.json`);
}

export async function listEventChatMessages(
  tenantId: string,
  eventId: string
): Promise<LeonardoEventChatMessage[]> {
  const filePath = getChatFilePath(tenantId, eventId);
  const stored = await readJsonFile<LeonardoEventChatMessage[]>(filePath);
  if (!stored?.length) {
    return [];
  }
  return stored.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export async function appendEventChatMessage(
  session: LeanEventSession,
  eventId: string,
  input: {
    body: string;
    links?: LeonardoEventChatMessage["links"];
    mentions?: string[];
    attachments?: LeonardoEventChatMessage["attachments"];
  }
): Promise<LeonardoEventChatMessage> {
  const event = await getEvent(session.tenantId, eventId);
  if (!event) {
    throw new Error("EVENT_NOT_FOUND");
  }

  const body = input.body.trim();
  if (!body && !(input.attachments?.length ?? 0)) {
    throw new Error("EMPTY_MESSAGE");
  }

  const message: LeonardoEventChatMessage = {
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

  const existing = await listEventChatMessages(session.tenantId, eventId);
  const filePath = getChatFilePath(session.tenantId, eventId);
  await writeJsonFile(filePath, [...existing, message]);
  return message;
}

export function extractMentions(text: string): string[] {
  const matches = text.match(/@[\w.+-]+@[\w.-]+\.\w+|@[\w.-]+/g) ?? [];
  return [...new Set(matches.map((item) => item.slice(1).trim()).filter(Boolean))];
}
