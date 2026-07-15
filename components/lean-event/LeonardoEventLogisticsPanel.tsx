"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { EventAssignmentWithContact } from "@/lib/lean-event/event-assignments";
import { normalizeHotelBlocks } from "@/lib/lean-event/event-hotel";
import {
  buildEventLogisticsManifest,
  buildLogisticsTransferSuggestions,
  downloadLogisticsCsv,
  downloadTransferSuggestionsCsv,
  filterLogisticsManifest,
  summarizeEventLogistics,
} from "@/lib/lean-event/event-logistics";
import { TRAVEL_DIRECTION_LABELS, TRAVEL_MODE_LABELS } from "@/lib/lean-event/hospitality";
import { leanEventLeonardoContactPath } from "@/lib/lean-event/paths";
import type {
  LeonardoEvent,
  LeonardoTravelDirection,
  LeonardoTravelMode,
  LeonardoVenue,
} from "@/types/lean-event";

interface LeonardoEventLogisticsPanelProps {
  tenantSlug: string;
  event: LeonardoEvent;
  venues: LeonardoVenue[];
  assignments: EventAssignmentWithContact[];
}

export function LeonardoEventLogisticsPanel({
  tenantSlug,
  event,
  venues,
  assignments,
}: LeonardoEventLogisticsPanelProps) {
  const [query, setQuery] = useState("");
  const [transferOnly, setTransferOnly] = useState(false);
  const [mode, setMode] = useState<LeonardoTravelMode | "">("");
  const [direction, setDirection] = useState<LeonardoTravelDirection | "">("");

  const hotelBlocks = useMemo(() => normalizeHotelBlocks(event), [event]);

  const manifest = useMemo(
    () => buildEventLogisticsManifest(assignments, hotelBlocks, venues),
    [assignments, hotelBlocks, venues]
  );

  const transferSuggestions = useMemo(
    () => buildLogisticsTransferSuggestions(assignments),
    [assignments]
  );

  const filtered = useMemo(
    () =>
      filterLogisticsManifest(manifest, {
        query,
        transferOnly,
        mode,
        direction,
      }),
    [manifest, query, transferOnly, mode, direction]
  );

  const summary = useMemo(
    () => summarizeEventLogistics(assignments, manifest),
    [assignments, manifest]
  );

  return (
    <section className="space-y-6 rounded-xl border border-white/10 bg-[#111111] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-leanme-fuchsia">
            Logistica
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            Cruscotto operativo: viaggi e transfer aggregati dalle schede ospiti.
            Per modificare i dati, usa il tab Ospiti.
          </p>
          <p className="mt-2 text-xs text-white/45">
            {summary.guestCount} ospiti · {summary.transferCount} con transfer ·{" "}
            {summary.travelLegCount} tratte · {summary.pendingTravelCount} da
            completare · {summary.transferGroupCount} gruppi transfer ottimizzabili
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={filtered.length === 0}
            onClick={() => downloadLogisticsCsv(filtered, event.title)}
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:border-leanme-fuchsia disabled:opacity-40"
          >
            Export Excel
          </button>
          <button
            type="button"
            disabled={transferSuggestions.length === 0}
            onClick={() =>
              downloadTransferSuggestionsCsv(transferSuggestions, event.title)
            }
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:border-leanme-fuchsia disabled:opacity-40"
          >
            Export gruppi transfer
          </button>
        </div>
      </div>

      {transferSuggestions.length > 0 ? (
        <div className="space-y-3 rounded-xl border border-leanme-fuchsia/20 bg-leanme-fuchsia/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-leanme-fuchsia">
            Suggerimenti compattazione transfer
          </p>
          <p className="text-xs text-white/55">
            Ospiti con stesso orario di transfer e stesso mezzo — valuta un unico
            mezzo per ottimizzare la flotta.
          </p>
          <ul className="space-y-2">
            {transferSuggestions.map((group) => (
              <li
                key={group.id}
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              >
                <p className="font-medium text-white">
                  {group.direction === "in" ? "Arrivo" : "Partenza"} ·{" "}
                  {group.transferTimeLabel} · {group.modeLabel}
                </p>
                <p className="mt-1 text-xs text-white/55">
                  {group.guestCount} ospiti: {group.guestNames.join(", ")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cerca ospite, hotel, mezzo…"
          className="rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia xl:col-span-2"
        />
        <select
          value={mode}
          onChange={(event) =>
            setMode(event.target.value as LeonardoTravelMode | "")
          }
          className="rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
        >
          <option value="">Tutti i mezzi</option>
          {Object.entries(TRAVEL_MODE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={direction}
          onChange={(event) =>
            setDirection(event.target.value as LeonardoTravelDirection | "")
          }
          className="rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
        >
          <option value="">Andata e ritorno</option>
          {Object.entries(TRAVEL_DIRECTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm text-white/70">
        <input
          type="checkbox"
          checked={transferOnly}
          onChange={(event) => setTransferOnly(event.target.checked)}
          className="accent-leanme-fuchsia"
        />
        Solo ospiti con transfer
      </label>

      {assignments.length === 0 ? (
        <p className="text-sm text-white/50">
          Nessun ospite assegnato. Aggiungi ospiti dal tab Ospiti.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-white/50">Nessun risultato con i filtri attuali.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-black/50 text-xs uppercase tracking-[0.1em] text-white/45">
              <tr>
                <th className="px-3 py-2.5">Ospite</th>
                <th className="hidden px-3 py-2.5 md:table-cell">Ruolo</th>
                <th className="hidden px-3 py-2.5 lg:table-cell">Hotel / camera</th>
                <th className="px-3 py-2.5">Tratta</th>
                <th className="px-3 py-2.5">Orari</th>
                <th className="hidden px-3 py-2.5 sm:table-cell">Transfer</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={`${row.assignmentId}-${row.segmentId || "empty"}`}
                  className="border-t border-white/10 bg-[#111111]"
                >
                  <td className="px-3 py-2.5">
                    <Link
                      href={leanEventLeonardoContactPath(tenantSlug, row.contactId)}
                      className="font-medium text-white transition hover:text-leanme-fuchsia"
                    >
                      {row.contactName}
                    </Link>
                    <p className="mt-0.5 text-xs text-white/45 md:hidden">
                      {row.roleLabel}
                    </p>
                  </td>
                  <td className="hidden px-3 py-2.5 text-white/70 md:table-cell">
                    {row.roleLabel}
                  </td>
                  <td className="hidden px-3 py-2.5 text-white/70 lg:table-cell">
                    <p>{row.hotelLabel}</p>
                    <p className="text-xs text-white/45">{row.roomLabel}</p>
                  </td>
                  <td className="px-3 py-2.5 text-white/80">
                    {row.segmentId ? (
                      <>
                        <p>
                          {row.directionLabel} · {row.modeLabel}
                        </p>
                        {(row.originLabel !== "—" ||
                          row.destinationLabel !== "—") && (
                          <p className="text-xs text-white/45">
                            {row.originLabel}
                            {row.destinationLabel !== "—"
                              ? ` → ${row.destinationLabel}`
                              : ""}
                          </p>
                        )}
                        {row.carrier ? (
                          <p className="text-xs text-white/45">{row.carrier}</p>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-white/45">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-white/70">
                    <p>{row.scheduleLabel}</p>
                    {row.transferIn || row.transferOut ? (
                      <p className="mt-1 text-xs text-leanme-fuchsia">
                        {row.transferIn && row.transferInTimeLabel !== "—"
                          ? `Arr. ${row.transferInTimeLabel}`
                          : ""}
                        {row.transferIn &&
                        row.transferOut &&
                        row.transferInTimeLabel !== "—" &&
                        row.transferOutTimeLabel !== "—"
                          ? " · "
                          : ""}
                        {row.transferOut && row.transferOutTimeLabel !== "—"
                          ? `Part. ${row.transferOutTimeLabel}`
                          : ""}
                      </p>
                    ) : null}
                  </td>
                  <td className="hidden px-3 py-2.5 sm:table-cell">
                    {row.transferIn || row.transferOut ? (
                      <span className="text-xs text-leanme-fuchsia">
                        {row.transferIn ? "Arr." : ""}
                        {row.transferIn && row.transferOut ? " · " : ""}
                        {row.transferOut ? "Part." : ""}
                      </span>
                    ) : (
                      <span className="text-white/35">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
