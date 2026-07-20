import {
  isLeanMePlatformOperator,
  loadTenantsCatalog,
} from "@/lib/lean-event/auth";
import { isEntityActive, withLifecycleDefaults } from "@/lib/lean-event/entity-lifecycle";
import {
  getStoredTeresaChatThread,
  listStoredTeresaChatThreadsForTenants,
} from "@/lib/lean-event/teresa-chat-storage";
import type {
  LeanEventSession,
  TeresaChatMessage,
  TeresaChatThread,
  TeresaSuperviseThreadSummary,
} from "@/types/lean-event";

export type { TeresaSuperviseThreadSummary };

function normalizeThread(thread: TeresaChatThread): TeresaChatThread {
  return withLifecycleDefaults({
    ...thread,
    messages: thread.messages ?? [],
  }) as TeresaChatThread;
}

function previewText(value: string | undefined, max = 120): string | null {
  const text = value?.trim();
  if (!text) {
    return null;
  }
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1)}…`;
}

/** Solo operatori piattaforma LeanMe (supervisione globale). */
export function canSuperviseTeresa(session: LeanEventSession): boolean {
  return isLeanMePlatformOperator(session);
}

function toSummary(
  thread: TeresaChatThread,
  tenantMeta?: { name: string; slug: string }
): TeresaSuperviseThreadSummary {
  const messages = [...thread.messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const userMessages = messages.filter((message) => message.role === "user");
  const assistantMessages = messages.filter(
    (message) => message.role === "assistant"
  );
  const lastUser = userMessages[userMessages.length - 1];
  const lastAssistant = assistantMessages[assistantMessages.length - 1];
  const lastAny = messages[messages.length - 1];

  return {
    id: thread.id,
    tenantId: thread.tenantId,
    tenantName: tenantMeta?.name ?? thread.tenantId,
    tenantSlug: tenantMeta?.slug ?? thread.tenantId,
    title: thread.title?.trim() || null,
    userId: thread.userId,
    userName: thread.userName,
    userEmail: thread.userEmail,
    messageCount: messages.length,
    userMessageCount: userMessages.length,
    assistantMessageCount: assistantMessages.length,
    updatedAt: thread.updatedAt,
    createdAt: thread.createdAt,
    lastUserPreview: previewText(lastUser?.content),
    lastAssistantPreview: previewText(lastAssistant?.content),
    lastContextLabel: lastAny?.contextLabel ?? null,
  };
}

export async function listTeresaThreadsForSupervision(
  session: LeanEventSession
): Promise<TeresaSuperviseThreadSummary[]> {
  if (!canSuperviseTeresa(session)) {
    throw new Error("FORBIDDEN");
  }

  const tenants = await loadTenantsCatalog();
  const byId = new Map(
    tenants.map((tenant) => [
      tenant.id,
      { name: tenant.name, slug: tenant.slug },
    ])
  );
  const threads = await listStoredTeresaChatThreadsForTenants(
    tenants.map((tenant) => tenant.id)
  );

  return threads
    .map(normalizeThread)
    .filter((thread) => isEntityActive(thread))
    .map((thread) => toSummary(thread, byId.get(thread.tenantId)))
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
}

export async function getTeresaThreadForSupervision(
  session: LeanEventSession,
  threadId: string,
  tenantId?: string | null
): Promise<{
  summary: TeresaSuperviseThreadSummary;
  messages: TeresaChatMessage[];
} | null> {
  if (!canSuperviseTeresa(session)) {
    throw new Error("FORBIDDEN");
  }

  const tenants = await loadTenantsCatalog();
  const candidateTenantIds = tenantId
    ? [tenantId]
    : tenants.map((tenant) => tenant.id);

  let raw: TeresaChatThread | null = null;
  let resolvedTenantId: string | null = null;

  for (const candidate of candidateTenantIds) {
    const found = await getStoredTeresaChatThread(candidate, threadId);
    if (found && isEntityActive(normalizeThread(found))) {
      raw = found;
      resolvedTenantId = candidate;
      break;
    }
  }

  if (!raw || !resolvedTenantId) {
    return null;
  }

  const tenant = tenants.find((entry) => entry.id === resolvedTenantId);
  const thread = normalizeThread(raw);
  const messages = [...thread.messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return {
    summary: toSummary(
      thread,
      tenant ? { name: tenant.name, slug: tenant.slug } : undefined
    ),
    messages,
  };
}
