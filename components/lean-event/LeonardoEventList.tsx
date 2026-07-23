"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { LeonardoBulkImport } from "@/components/lean-event/LeonardoBulkImport";
import { LeonardoEntityId } from "@/components/lean-event/LeonardoEntityId";
import { LeonardoListSortSelect } from "@/components/lean-event/LeonardoListSortSelect";
import {
  LeonardoPageHeader,
  LEONARDO_PAGE_ACTION_BUTTON,
  LEONARDO_PAGE_ACTION_BUTTON_SECONDARY,
  LEONARDO_PAGE_ACTION_BUTTON_SECONDARY_ACTIVE,
} from "@/components/lean-event/LeonardoPageHeader";
import { useLeonardoWorkTabsOptional } from "@/components/lean-event/LeonardoWorkTabsContext";
import {
  LEONARDO_LIST_NAME_CELL,
  LEONARDO_LIST_NAME_LINK,
  LEONARDO_LIST_STICKY_HEADER,
} from "@/components/lean-event/leonardo-ui";
import { formatEuropeanDate } from "@/lib/lean-event/dates";
import { sortEvents, type ListSortMode } from "@/lib/lean-event/list-sort";
import {
  formatEventProjectRif,
  resolveEventVenueCity,
} from "@/lib/lean-event/tenant-users-display";
import {
  leanEventLeonardoEventNewPath,
  leanEventLeonardoEventPath,
} from "@/lib/lean-event/paths";
import type {
  LeanEventTenantUserPublic,
  TenantEvent,
  LeonardoVenue,
} from "@/types/lean-event";

const statusLabels: Record<TenantEvent["status"], string> = {
  draft: "Bozza",
  active: "Attivo",
  completed: "Completato",
  archived: "Archiviato",
};

type EventSection = "list" | "import";

interface LeonardoEventListProps {
  tenantSlug: string;
  initialEvents: TenantEvent[];
  venues: LeonardoVenue[];
  tenantUsers: LeanEventTenantUserPublic[];
}

export function LeonardoEventList({
  tenantSlug,
  initialEvents,
  venues,
  tenantUsers,
}: LeonardoEventListProps) {
  const workTabs = useLeonardoWorkTabsOptional();
  const [events, setEvents] = useState(initialEvents);
  const [section, setSection] = useState<EventSection>("list");
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortMode, setSortMode] = useState<ListSortMode>("date_start");
  const [favoriteBusyId, setFavoriteBusyId] = useState<string | null>(null);

  const venueById = useMemo(
    () => new Map(venues.map((venue) => [venue.id, venue])),
    [venues]
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    let rows = events;
    if (favoritesOnly) {
      rows = rows.filter((event) => Boolean(event.isFavorite));
    }
    if (normalized) {
      rows = rows.filter((event) => {
        const projectRif = formatEventProjectRif(event, tenantUsers).toLowerCase();
        return (
          event.title.toLowerCase().includes(normalized) ||
          event.cdc.toLowerCase().includes(normalized) ||
          event.venue.toLowerCase().includes(normalized) ||
          resolveEventVenueCity(event, venues).toLowerCase().includes(normalized) ||
          projectRif.includes(normalized)
        );
      });
    }
    return sortEvents(rows, sortMode);
  }, [events, favoritesOnly, query, sortMode, tenantUsers, venues]);

  async function reloadEvents() {
    const response = await fetch("/api/lean-event/events", {
      credentials: "same-origin",
    });
    const payload = (await response.json()) as { events?: TenantEvent[] };
    if (payload.events) {
      setEvents(payload.events);
    }
  }

  async function handleDelete(id: string) {
    const response = await fetch(`/api/lean-event/events/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (response.ok) {
      setEvents((current) => current.filter((event) => event.id !== id));
    }
  }

  async function toggleFavorite(event: TenantEvent) {
    const previousFavorite = Boolean(event.isFavorite);
    const nextFavorite = !previousFavorite;
    setFavoriteBusyId(event.id);
    setEvents((current) =>
      current.map((row) =>
        row.id === event.id ? { ...row, isFavorite: nextFavorite } : row
      )
    );
    try {
      const latest =
        events.find((row) => row.id === event.id)?.revision ?? event.revision;
      const response = await fetch(`/api/lean-event/events/${event.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isFavorite: nextFavorite,
          expectedRevision: latest,
        }),
      });
      const payload = (await response.json()) as {
        event?: TenantEvent;
        error?: string;
      };
      if (!response.ok || !payload.event) {
        setEvents((current) =>
          current.map((row) =>
            row.id === event.id
              ? { ...row, isFavorite: previousFavorite }
              : row
          )
        );
        window.alert(
          payload.error ?? "Aggiornamento preferito non riuscito."
        );
        return;
      }
      setEvents((current) =>
        current.map((row) =>
          row.id === event.id
            ? {
                ...payload.event!,
                isFavorite: Boolean(payload.event!.isFavorite),
              }
            : row
        )
      );
    } catch {
      setEvents((current) =>
        current.map((row) =>
          row.id === event.id
            ? { ...row, isFavorite: previousFavorite }
            : row
        )
      );
      window.alert("Aggiornamento preferito non riuscito.");
    } finally {
      setFavoriteBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <LeonardoPageHeader
        title="Eventi"
        subtitle="Gestione eventi, CDC, sedi, date e project team."
        action={
          <>
            <Link
              href={leanEventLeonardoEventNewPath(tenantSlug)}
              className={LEONARDO_PAGE_ACTION_BUTTON}
            >
              Nuovo evento
            </Link>
            <button
              type="button"
              onClick={() =>
                setSection((current) =>
                  current === "import" ? "list" : "import"
                )
              }
              className={
                section === "import"
                  ? LEONARDO_PAGE_ACTION_BUTTON_SECONDARY_ACTIVE
                  : LEONARDO_PAGE_ACTION_BUTTON_SECONDARY
              }
            >
              {section === "import"
                ? "Torna all'elenco"
                : "Importazione massiva"}
            </button>
          </>
        }
      />

      {section === "import" ? (
        <LeonardoBulkImport kind="events" onImported={reloadEvents} />
      ) : (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca titolo, CDC, città, project team…"
              className="min-w-0 w-full flex-1 rounded-lg border border-white/15 bg-[#111111] px-4 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
            <div className="flex flex-wrap items-end gap-2">
              <button
                type="button"
                onClick={() => setFavoritesOnly((current) => !current)}
                aria-pressed={favoritesOnly}
                title={
                  favoritesOnly
                    ? "Mostra tutti gli eventi"
                    : "Mostra solo i preferiti"
                }
                className={
                  favoritesOnly
                    ? "inline-flex h-10 items-center gap-1.5 rounded-lg border border-leanme-fuchsia/55 bg-leanme-fuchsia/15 px-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia/25"
                    : "inline-flex h-10 items-center gap-1.5 rounded-lg border border-white/15 bg-[#111111] px-3 text-xs font-semibold uppercase tracking-[0.08em] text-white/70 transition hover:border-white/30 hover:text-white"
                }
              >
                <span aria-hidden className="text-sm leading-none">
                  {favoritesOnly ? "★" : "☆"}
                </span>
                Preferiti
              </button>
              <div className="min-w-[11rem] flex-1 sm:flex-none sm:w-[13.5rem]">
                <LeonardoListSortSelect
                  value={sortMode}
                  onChange={(value) => setSortMode(value as ListSortMode)}
                  includeEventDate
                  className="h-10 w-full rounded-lg border border-white/15 bg-[#111111] px-3 py-0 text-sm outline-none focus:border-leanme-fuchsia"
                />
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-[#111111] p-6 text-sm text-white/60">
              {favoritesOnly
                ? "Nessun evento preferito. Usa la stellina in elenco per aggiungerne."
                : "Nessun evento. Crea il primo evento o usa Importazione massiva."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="min-w-[980px] w-full text-sm">
                <thead>
                  <tr className={LEONARDO_LIST_STICKY_HEADER}>
                    <th className="w-12 px-2 py-3 text-center" aria-label="Preferito" />
                    <th className="px-4 py-3">Titolo</th>
                    <th className="px-4 py-3">Città sede</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">CDC</th>
                    <th className="px-4 py-3">Stato</th>
                    <th className="px-4 py-3">REF</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((event) => (
                    <tr
                      key={event.id}
                      className="border-t border-white/10 bg-[#111111]"
                    >
                      <td className="px-2 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => void toggleFavorite(event)}
                          disabled={favoriteBusyId === event.id}
                          title={
                            event.isFavorite
                              ? "Rimuovi dai preferiti"
                              : "Aggiungi ai preferiti"
                          }
                          aria-label={
                            event.isFavorite
                              ? `Rimuovi ${event.title} dai preferiti`
                              : `Aggiungi ${event.title} ai preferiti`
                          }
                          aria-pressed={Boolean(event.isFavorite)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-lg leading-none transition hover:bg-white/5 disabled:opacity-50"
                        >
                          <span
                            className={
                              event.isFavorite
                                ? "text-amber-300"
                                : "text-white/25 hover:text-amber-200/80"
                            }
                            aria-hidden
                          >
                            {event.isFavorite ? "★" : "☆"}
                          </span>
                        </button>
                      </td>
                      <td className={`px-4 py-3 ${LEONARDO_LIST_NAME_CELL}`}>
                        {workTabs ? (
                          <button
                            type="button"
                            title={event.title}
                            onClick={() =>
                              workTabs.openTab({
                                kind: "event",
                                entityId: event.id,
                                title: event.title,
                              })
                            }
                            className={`${LEONARDO_LIST_NAME_LINK} w-full text-left`}
                          >
                            {event.title}
                          </button>
                        ) : (
                          <Link
                            href={leanEventLeonardoEventPath(tenantSlug, event.id)}
                            title={event.title}
                            className={LEONARDO_LIST_NAME_LINK}
                          >
                            {event.title}
                          </Link>
                        )}
                        <LeonardoEntityId id={event.id} />
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {event.venueId
                          ? venueById.get(event.venueId)?.city ||
                            resolveEventVenueCity(event, venues)
                          : resolveEventVenueCity(event, venues)}
                      </td>
                      <td className="px-4 py-3 text-white/70 whitespace-nowrap">
                        {formatEuropeanDate(event.startDate)}
                        {event.endDate !== event.startDate
                          ? ` → ${formatEuropeanDate(event.endDate)}`
                          : ""}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {event.cdc || "—"}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {statusLabels[event.status]}
                      </td>
                      <td className="max-w-[280px] px-4 py-3 text-white/70">
                        <span className="line-clamp-2 text-xs leading-relaxed">
                          {formatEventProjectRif(event, tenantUsers)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void handleDelete(event.id)}
                          className="text-xs uppercase tracking-[0.08em] text-red-300 hover:text-red-200"
                        >
                          Elimina
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
