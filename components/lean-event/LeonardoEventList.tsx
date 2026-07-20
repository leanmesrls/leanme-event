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
  LeonardoEvent,
  LeonardoVenue,
} from "@/types/lean-event";

const statusLabels: Record<LeonardoEvent["status"], string> = {
  draft: "Bozza",
  active: "Attivo",
  completed: "Completato",
  archived: "Archiviato",
};

type EventSection = "list" | "import";

interface LeonardoEventListProps {
  tenantSlug: string;
  initialEvents: LeonardoEvent[];
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
  const [sortMode, setSortMode] = useState<ListSortMode>("date_start");

  const venueById = useMemo(
    () => new Map(venues.map((venue) => [venue.id, venue])),
    [venues]
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    let rows = events;
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
  }, [events, query, sortMode, tenantUsers, venues]);

  async function reloadEvents() {
    const response = await fetch("/api/lean-event/events", {
      credentials: "same-origin",
    });
    const payload = (await response.json()) as { events?: LeonardoEvent[] };
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
          <div className="grid gap-3 md:grid-cols-[1fr_minmax(180px,240px)]">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca titolo, CDC, città, project team…"
              className="w-full rounded-lg border border-white/15 bg-[#111111] px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
            />
            <LeonardoListSortSelect
              value={sortMode}
              onChange={(value) => setSortMode(value as ListSortMode)}
              includeEventDate
            />
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-[#111111] p-6 text-sm text-white/60">
              Nessun evento. Crea il primo evento o usa Importazione massiva.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="min-w-[980px] w-full text-sm">
                <thead>
                  <tr className={LEONARDO_LIST_STICKY_HEADER}>
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
