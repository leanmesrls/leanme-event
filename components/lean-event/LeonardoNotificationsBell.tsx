"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  countUnreadAmong,
  NOTIFICATIONS_CHANGED_EVENT,
  type LeanEventNotification,
} from "@/lib/lean-event/notifications-client";
import { leanEventLeonardoNotifichePath } from "@/lib/lean-event/paths";

interface LeonardoNotificationsBellProps {
  tenantSlug: string;
  userEmail: string;
}

export function LeonardoNotificationsBell({
  tenantSlug,
  userEmail,
}: LeonardoNotificationsBellProps) {
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<LeanEventNotification[]>(
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      try {
        const res = await fetch("/api/leanyou/product-notifications", {
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          notifications?: LeanEventNotification[];
        };
        if (cancelled) return;
        setNotifications(data.notifications ?? []);
      } catch {
        /* ignore transient fetch errors for badge */
      }
    }

    void loadNotifications();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function refresh() {
      setUnread(countUnreadAmong(notifications, tenantSlug, userEmail));
    }
    refresh();

    function onStorage(event: StorageEvent) {
      if (event.key?.startsWith("lean-event.notifications.read:")) {
        refresh();
      }
    }

    window.addEventListener("focus", refresh);
    window.addEventListener("storage", onStorage);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, refresh);
    };
  }, [notifications, tenantSlug, userEmail]);

  const href = leanEventLeonardoNotifichePath(tenantSlug);
  const label =
    unread > 0
      ? `Notifiche, ${unread} non lette`
      : "Notifiche";

  return (
    <Link
      href={href}
      className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-white/15 text-white/80 transition hover:border-leanme-fuchsia/50 hover:text-white"
      aria-label={label}
      title={label}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      >
        <path
          d="M12 22a2.2 2.2 0 0 0 2.2-2.2h-4.4A2.2 2.2 0 0 0 12 22Zm7-6.2V11a7 7 0 1 0-14 0v4.8L3.5 17.3v1.2h17v-1.2L19 15.8Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {unread > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-leanme-fuchsia px-1 text-[10px] font-bold leading-none text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
