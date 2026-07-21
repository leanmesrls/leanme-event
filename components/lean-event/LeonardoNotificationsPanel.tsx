"use client";

import { useEffect, useMemo, useState } from "react";

import {
  listProductNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  readNotificationIds,
  type LeanEventNotification,
} from "@/lib/lean-event/notifications";
import { formatEuropeanDate } from "@/lib/lean-event/dates";
import { LEONARDO_CANVAS_SURFACE } from "@/components/lean-event/leonardo-ui";

interface LeonardoNotificationsPanelProps {
  tenantSlug: string;
  userEmail: string;
}

export function LeonardoNotificationsPanel({
  tenantSlug,
  userEmail,
}: LeonardoNotificationsPanelProps) {
  const notifications = useMemo(() => listProductNotifications(), []);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [openId, setOpenId] = useState<string | null>(
    notifications[0]?.id ?? null
  );

  useEffect(() => {
    setReadIds(readNotificationIds(tenantSlug, userEmail));
  }, [tenantSlug, userEmail]);

  function openNotification(item: LeanEventNotification) {
    setOpenId(item.id);
    markNotificationRead(tenantSlug, userEmail, item.id);
    setReadIds(readNotificationIds(tenantSlug, userEmail));
  }

  function handleMarkAll() {
    markAllNotificationsRead(tenantSlug, userEmail);
    setReadIds(readNotificationIds(tenantSlug, userEmail));
  }

  const openItem =
    notifications.find((item) => item.id === openId) ?? notifications[0] ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-leanme-fuchsia">Notifiche</h2>
          <p className="mt-1 text-sm text-white/55">
            Aggiornamenti periodici LeanMe sul prodotto e sui moduli.
          </p>
        </div>
        <button
          type="button"
          onClick={handleMarkAll}
          className="rounded-full border border-white/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70 transition hover:border-white hover:text-white"
        >
          Segna tutte come lette
        </button>
      </div>

      {notifications.length === 0 ? (
        <p className="text-sm text-white/50">Nessuna notifica al momento.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
          <ul className="space-y-2">
            {notifications.map((item) => {
              const unread = !readIds.has(item.id);
              const active = openItem?.id === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openNotification(item)}
                    className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                      active
                        ? "border-leanme-fuchsia/50 bg-leanme-fuchsia/10"
                        : "border-white/10 bg-[#111111] hover:border-white/25"
                    }`}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-white/90">
                        {item.title}
                      </span>
                      {unread ? (
                        <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-leanme-fuchsia" />
                      ) : null}
                    </span>
                    <span className="mt-1 block text-[11px] text-white/40">
                      {formatEuropeanDate(item.publishedAt.slice(0, 10))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {openItem ? (
            <article className={`${LEONARDO_CANVAS_SURFACE} space-y-3`}>
              <p className="text-[11px] uppercase tracking-[0.12em] text-white/40">
                {formatEuropeanDate(openItem.publishedAt.slice(0, 10))}
                {openItem.priority === "high" ? " · Prioritaria" : ""}
              </p>
              <h3 className="text-lg font-bold text-white">{openItem.title}</h3>
              <p className="text-sm text-white/60">{openItem.summary}</p>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-white/75">
                {openItem.body}
              </div>
            </article>
          ) : null}
        </div>
      )}
    </div>
  );
}
