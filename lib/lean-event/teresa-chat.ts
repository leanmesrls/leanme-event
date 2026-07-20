import { randomUUID } from "node:crypto";

import type {
  LeanEventSession,
  TeresaChatMessage,
  TeresaChatThread,
  TeresaSuperviseThreadSummary,
} from "@/types/lean-event";

import {
  auditManagedEntityMutation,
  resolveEntityAuditAction,
  writeLeanEventAuditEvent,
} from "./audit-log";
import { upsertManagedEntityToNeon } from "./entity-db";
import {
  isEntityActive,
  prepareEntityCreate,
  prepareEntityUpdate,
  sessionUserId,
  withLifecycleDefaults,
} from "./entity-lifecycle";
import {
  getStoredTeresaChatThread,
  legacyTeresaChatThreadId,
  listStoredTeresaChatThreads,
  saveStoredTeresaChatThread,
  teresaChatThreadId,
} from "./teresa-chat-storage";
import { saveEntityVersionSnapshot } from "./version-storage";

/** Messaggi conservati e mostrati per conversazione (per utente / thread). */
export const TERESA_MAX_MESSAGES_PER_THREAD = 50;
/** Quanti messaggi recenti inviare al modello (sotto il tetto di retention). */
const MAX_MODEL_HISTORY_MESSAGES = 24;
const MAX_USER_MESSAGE_CHARS = 4000;

export type TeresaChatContext = {
  label?: string;
  kind?: string;
  entityId?: string;
  pathname?: string;
};

export type TeresaUserThreadSummary = {
  id: string;
  title: string;
  messageCount: number;
  updatedAt: string;
  createdAt: string;
  lastPreview: string | null;
};

function normalizeThread(thread: TeresaChatThread): TeresaChatThread {
  return withLifecycleDefaults({
    ...thread,
    messages: thread.messages ?? [],
  }) as TeresaChatThread;
}

function sortMessages(messages: TeresaChatMessage[]): TeresaChatMessage[] {
  return [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

function pruneMessages(messages: TeresaChatMessage[]): TeresaChatMessage[] {
  const sorted = sortMessages(messages);
  if (sorted.length <= TERESA_MAX_MESSAGES_PER_THREAD) {
    return sorted;
  }
  return sorted.slice(-TERESA_MAX_MESSAGES_PER_THREAD);
}

function titleFromMessages(messages: TeresaChatMessage[]): string {
  const firstUser = sortMessages(messages).find((message) => message.role === "user");
  const text = firstUser?.content.trim();
  if (!text) {
    return "Nuova conversazione";
  }
  return text.length > 48 ? `${text.slice(0, 47)}…` : text;
}

function previewFromMessages(messages: TeresaChatMessage[]): string | null {
  const lastUser = [...sortMessages(messages)]
    .reverse()
    .find((message) => message.role === "user");
  const text = lastUser?.content.trim();
  if (!text) {
    return null;
  }
  return text.length > 100 ? `${text.slice(0, 99)}…` : text;
}

async function persistThread(
  thread: TeresaChatThread,
  previous: TeresaChatThread | null
): Promise<void> {
  if (previous) {
    await saveEntityVersionSnapshot(
      thread.tenantId,
      "teresa_chat",
      thread.id,
      previous.revision ?? 1,
      previous
    );
  }
  await saveStoredTeresaChatThread(thread);
  await upsertManagedEntityToNeon("teresa_chat", thread);
  await auditManagedEntityMutation({
    tenantId: thread.tenantId,
    entityType: "teresa_chat",
    entityId: thread.id,
    action: resolveEntityAuditAction(previous, thread),
    userId: thread.updatedBy,
  });
}

function getOpenAiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }
  return key;
}

function buildSystemPrompt(session: LeanEventSession, context: TeresaChatContext): string {
  const contextLines = [
    context.label ? `Contesto UI: ${context.label}` : null,
    context.kind ? `Tipo scheda: ${context.kind}` : null,
    context.entityId ? `ID entità: ${context.entityId}` : null,
    context.pathname ? `Path: ${context.pathname}` : null,
  ].filter(Boolean);

  return [
    "Sei Lean.Agent.Teresa, assistente operativa della piattaforma LeanEvent (LeanMe).",
    "Aiuti gli utenti nell'area riservata: navigazione, compilazione schede, processi eventi/rubrica/verbali.",
    "Rispondi in italiano, in modo chiaro e conciso.",
    "Non inventare dati tenant. Se non hai un dato, dillo e indica dove trovarlo in LeanEvent.",
    "Non rivelare secret, env vars, o dati di altri tenant.",
    "Non eseguire azioni distruttive: guida l'utente, non fingere di aver cancellato o modificato record.",
    `Tenant: ${session.tenantName} (${session.tenantSlug}).`,
    `Utente: ${session.userName} <${session.userEmail}> ruolo ${session.userRole}.`,
    contextLines.length ? contextLines.join("\n") : "Contesto UI: elenco / hub.",
  ].join("\n");
}

async function callTeresaModel(input: {
  session: LeanEventSession;
  context: TeresaChatContext;
  history: TeresaChatMessage[];
  userMessage: string;
}): Promise<string> {
  const history = input.history
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-MAX_MODEL_HISTORY_MESSAGES)
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content,
    }));

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenAiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model:
        process.env.OPENAI_TERESA_MODEL ??
        process.env.OPENAI_STRUCTURING_MODEL ??
        "gpt-4.1-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(input.session, input.context),
        },
        ...history,
        { role: "user", content: input.userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TERESA_OPENAI_FAILED:${errorText.slice(0, 400)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("TERESA_EMPTY_RESPONSE");
  }
  return content;
}

function assertOwnsThread(session: LeanEventSession, thread: TeresaChatThread) {
  if (
    thread.tenantId !== session.tenantId ||
    thread.userId !== session.userId
  ) {
    throw new Error("FORBIDDEN");
  }
}

function toUserSummary(thread: TeresaChatThread): TeresaUserThreadSummary {
  const messages = pruneMessages(thread.messages);
  return {
    id: thread.id,
    title: thread.title?.trim() || titleFromMessages(messages),
    messageCount: messages.length,
    updatedAt: thread.updatedAt,
    createdAt: thread.createdAt,
    lastPreview: previewFromMessages(messages),
  };
}

export async function listTeresaThreadsForUser(
  session: LeanEventSession
): Promise<TeresaUserThreadSummary[]> {
  const all = await listStoredTeresaChatThreads(session.tenantId);
  return all
    .map(normalizeThread)
    .filter(
      (thread) =>
        isEntityActive(thread) &&
        thread.userId === session.userId &&
        thread.tenantId === session.tenantId
    )
    .map(toUserSummary)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
}

async function resolveThreadForUser(
  session: LeanEventSession,
  threadId?: string | null
): Promise<TeresaChatThread | null> {
  if (threadId) {
    const raw = await getStoredTeresaChatThread(session.tenantId, threadId);
    if (!raw || !isEntityActive(normalizeThread(raw))) {
      return null;
    }
    const thread = normalizeThread(raw);
    assertOwnsThread(session, thread);
    return thread;
  }

  const threads = await listTeresaThreadsForUser(session);
  if (threads[0]) {
    return resolveThreadForUser(session, threads[0].id);
  }

  // Migrazione lazy dal vecchio id singolo
  const legacyId = legacyTeresaChatThreadId(session.userId);
  const legacy = await getStoredTeresaChatThread(session.tenantId, legacyId);
  if (legacy && isEntityActive(normalizeThread(legacy))) {
    return normalizeThread(legacy);
  }

  return null;
}

export async function getTeresaChatForUser(
  session: LeanEventSession,
  threadId?: string | null
): Promise<TeresaChatThread | null> {
  return resolveThreadForUser(session, threadId);
}

export async function listTeresaChatMessages(
  session: LeanEventSession,
  threadId?: string | null
): Promise<TeresaChatMessage[]> {
  const thread = await getTeresaChatForUser(session, threadId);
  if (!thread) {
    return [];
  }
  return pruneMessages(thread.messages);
}

export async function createTeresaChatThread(
  session: LeanEventSession
): Promise<TeresaChatThread> {
  const now = new Date().toISOString();
  const userId = sessionUserId(session);
  const draft: TeresaChatThread = {
    id: teresaChatThreadId(session.userId, randomUUID().replace(/-/g, "").slice(0, 12)),
    tenantId: session.tenantId,
    userId: session.userId,
    userEmail: session.userEmail,
    userName: session.userName,
    title: "Nuova conversazione",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
  const thread = normalizeThread(prepareEntityCreate(draft, userId));
  await persistThread(thread, null);
  return thread;
}

export async function sendTeresaChatMessage(
  session: LeanEventSession,
  input: {
    message: string;
    threadId?: string | null;
    context?: TeresaChatContext;
  }
): Promise<{ thread: TeresaChatThread; reply: TeresaChatMessage }> {
  const content = input.message.trim();
  if (!content) {
    throw new Error("EMPTY_MESSAGE");
  }
  if (content.length > MAX_USER_MESSAGE_CHARS) {
    throw new Error("MESSAGE_TOO_LONG");
  }

  const context = input.context ?? {};
  const userId = sessionUserId(session);
  let previous = await resolveThreadForUser(session, input.threadId);

  if (!previous) {
    previous = await createTeresaChatThread(session);
  }

  const now = new Date().toISOString();
  const userMessage: TeresaChatMessage = {
    id: randomUUID(),
    role: "user",
    content,
    createdAt: now,
    contextLabel: context.label,
    contextKind: context.kind,
    contextEntityId: context.entityId,
  };

  const replyText = await callTeresaModel({
    session,
    context,
    history: pruneMessages(previous.messages),
    userMessage: content,
  });

  const reply: TeresaChatMessage = {
    id: randomUUID(),
    role: "assistant",
    content: replyText,
    createdAt: new Date().toISOString(),
    contextLabel: context.label,
    contextKind: context.kind,
    contextEntityId: context.entityId,
  };

  const nextMessages = pruneMessages([
    ...previous.messages,
    userMessage,
    reply,
  ]);
  const nextMeta = prepareEntityUpdate(previous, userId);
  const thread = normalizeThread({
    ...previous,
    title:
      previous.title && previous.title !== "Nuova conversazione"
        ? previous.title
        : titleFromMessages(nextMessages),
    messages: nextMessages,
    userEmail: session.userEmail,
    userName: session.userName,
    revision: nextMeta.revision,
    updatedAt: nextMeta.updatedAt!,
    updatedBy: nextMeta.updatedBy,
  });

  await persistThread(thread, previous);

  await writeLeanEventAuditEvent({
    action: "teresa_turn",
    tenantId: session.tenantId,
    tenantSlug: session.tenantSlug,
    tenantName: session.tenantName,
    userId,
    userEmail: session.userEmail,
    userName: session.userName,
    resourceType: "teresa_chat",
    resourceId: thread.id,
    detail: "Teresa chat turn",
    payload: {
      userMessageId: userMessage.id,
      assistantMessageId: reply.id,
      context,
      userChars: content.length,
      replyChars: replyText.length,
      messageCount: thread.messages.length,
    },
  });

  return { thread, reply };
}

/** Usato dalla supervisione: stesso shape già esportato. */
export type { TeresaSuperviseThreadSummary };
