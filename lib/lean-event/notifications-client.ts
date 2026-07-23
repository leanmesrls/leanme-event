export interface LeanEventNotification {
  id: string;
  title: string;
  summary: string;
  body: string;
  publishedAt: string;
  priority?: "normal" | "high";
}

const READ_STORAGE_PREFIX = "lean-event.notifications.read:";

function storageKey(tenantSlug: string, userEmail: string): string {
  return `${READ_STORAGE_PREFIX}${tenantSlug}:${userEmail.toLowerCase()}`;
}

export function readNotificationIds(
  tenantSlug: string,
  userEmail: string
): Set<string> {
  if (typeof window === "undefined") {
    return new Set();
  }
  try {
    const raw = localStorage.getItem(storageKey(tenantSlug, userEmail));
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function writeNotificationIds(
  tenantSlug: string,
  userEmail: string,
  ids: Set<string>
): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(
      storageKey(tenantSlug, userEmail),
      JSON.stringify([...ids])
    );
  } catch {
    /* ignore */
  }
}

export function countUnreadAmong(
  notifications: LeanEventNotification[],
  tenantSlug: string,
  userEmail: string
): number {
  const read = readNotificationIds(tenantSlug, userEmail);
  return notifications.filter((item) => !read.has(item.id)).length;
}

export const NOTIFICATIONS_CHANGED_EVENT = "lean-event-notifications-changed";

function emitNotificationsChanged(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}

export function markNotificationRead(
  tenantSlug: string,
  userEmail: string,
  notificationId: string
): void {
  const read = readNotificationIds(tenantSlug, userEmail);
  read.add(notificationId);
  writeNotificationIds(tenantSlug, userEmail, read);
  emitNotificationsChanged();
}

export function markAllNotificationsRead(
  tenantSlug: string,
  userEmail: string,
  notifications: LeanEventNotification[]
): void {
  const all = new Set(notifications.map((item) => item.id));
  writeNotificationIds(tenantSlug, userEmail, all);
  emitNotificationsChanged();
}
