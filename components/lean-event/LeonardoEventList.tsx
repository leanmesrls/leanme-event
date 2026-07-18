"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { LeonardoBulkImport } from "@/components/lean-event/LeonardoBulkImport";
import { LeonardoListSortSelect } from "@/components/lean-event/LeonardoListSortSelect";
import {
  LeonardoPageHeader,
  LEONARDO_PAGE_ACTION_BUTTON,
} from "@/components/lean-event/LeonardoPageHeader";
import { LeonardoPrimarySectionNav } from "@/components/lean-event/LeonardoSectionNav";
import {
  LEONARDO_LIST_NAME_CELL,
  LEONARDO_LIST_NAME_LINK,
} from "@/components/lean-event/leonardo-ui";
import { formatEuropeanDate } from "@/lib/lean-event/dates";
import { sortEvents, type ListSortMode } from "@/lib/lean-event/list-sort";
import {
  leanEventLeonardoEventNewPath,
  leanEventLeonardoEventPath,
} from "@/lib/lean-event/paths";
import type { LeonardoEvent } from "@/types/lean-event";

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
}

export function LeonardoEventList({
  tenantSlug,
  initialEvents,
}: LeonardoEventListProps) {
  const [events, setEvents] = useState(initialEvents);
  const [section, setSection] = useState<EventSection>("list");
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<ListSortMode>("date_start");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    let rows = events;
    if (normalized) {
      rows = rows.filter(
        (event) =>
          event.title.toLowerCase().includes(normalized) ||
          event.cdc.toLowerCase().includes(normalized) ||
          event.venue.toLowerCase().includes(normalized)
      );
    }
    return sortEvents(rows, sortMode);
  }, [events, query, sortMode]);

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
        subtitle="Gestione eventi, CDC, sedi e date."
        action={
          section === "list" ? (
            <Link
              href={leanEventLeonardoEventNewPath(tenantSlug)}
              className={LEONARDO_PAGE_ACTION_BUTTON}
            >
              Nuovo evento
            </Link>
          ) : null
        }
      />

      <LeonardoPrimarySectionNav
        aria-label="Sezioni eventi"
        sections={[
          { id: "list", label: "Visualizza elenco" },
          { id: "import", label: "Importazione massiva" },
        ]}
        active={section}
        onChange={setSection}
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
              placeholder="Cerca per titolo, CDC, sede..."
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
            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="min-w-full text-sm">
                <thead className="bg-[#141414] text-left text-xs uppercase tracking-[0.1em] text-white/45">
                  <tr>
                    <th className="px-4 py-3">Titolo</th>
                    <th className="px-4 py-3">CDC</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Sede</th>
                    <th className="px-4 py-3">Stato</th>
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
                        <Link
                          href={leanEventLeonardoEventPath(tenantSlug, event.id)}
                          title={event.title}
                          className={LEONARDO_LIST_NAME_LINK}
                        >
                          {event.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {event.cdc || "—"}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {formatEuropeanDate(event.startDate)}
                        {event.endDate !== event.startDate
                          ? ` → ${formatEuropeanDate(event.endDate)}`
                          : ""}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {event.venue || "—"}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {statusLabels[event.status]}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(event.id)}
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
