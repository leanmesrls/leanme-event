import { getControlPlaneSql } from "@/core/infrastructure/database/control-plane-client";
import type { LeanEventNotification } from "@/lib/lean-event/notifications-client";
import { listReleaseNotifications } from "@/lib/lean-event/releases";

export type { LeanEventNotification } from "@/lib/lean-event/notifications-client";

function mapAnnouncement(row: Record<string, unknown>): LeanEventNotification {
  const published =
    row.published_at instanceof Date
      ? row.published_at.toISOString()
      : String(row.published_at ?? "");
  const priority = row.priority === "high" ? "high" : "normal";

  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    summary: String(row.summary ?? ""),
    body: String(row.body ?? ""),
    publishedAt: published,
    priority,
  };
}

async function listPlatformAnnouncements(): Promise<LeanEventNotification[]> {
  const sql = getControlPlaneSql();
  const rows = await sql`
    SELECT id, published_at, title, summary, body, priority
    FROM lean_event_platform_announcements
    ORDER BY published_at DESC, id ASC
  `;
  return (rows as Record<string, unknown>[]).map(mapAnnouncement);
}

function mergeNotifications(
  announcementItems: LeanEventNotification[],
  releaseItems: LeanEventNotification[]
): LeanEventNotification[] {
  const byId = new Map<string, LeanEventNotification>();

  for (const item of announcementItems) {
    byId.set(item.id, item);
  }
  // Rilasci hanno priorità se collidono con id announcement.
  for (const item of releaseItems) {
    byId.set(item.id, item);
  }

  return [...byId.values()].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

/** Server-side: announcement + rilasci — SoT Control Plane Neon (non Blob, non JSON). */
export async function listProductNotifications(): Promise<
  LeanEventNotification[]
> {
  const [announcements, releaseItems] = await Promise.all([
    listPlatformAnnouncements(),
    listReleaseNotifications(),
  ]);
  return mergeNotifications(announcements, releaseItems);
}
