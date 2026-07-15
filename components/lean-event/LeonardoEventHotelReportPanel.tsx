"use client";

import { useMemo, useState } from "react";

import {
  buildAllotmentReport,
  downloadAllotmentCsv,
  downloadAllotmentCsvForHotel,
  groupAllotmentReportByHotel,
  summarizeAllotmentReport,
} from "@/lib/lean-event/allotment-report";
import type { EventAssignmentWithContact } from "@/lib/lean-event/event-assignments";
import { normalizeHotelBlocks } from "@/lib/lean-event/event-hotel";
import type { LeonardoEvent, LeonardoVenue } from "@/types/lean-event";

interface LeonardoEventHotelReportPanelProps {
  event: LeonardoEvent;
  venues: LeonardoVenue[];
  assignments: EventAssignmentWithContact[];
}

export function LeonardoEventHotelReportPanel({
  event,
  venues,
  assignments,
}: LeonardoEventHotelReportPanelProps) {
  const hotelBlocks = useMemo(() => normalizeHotelBlocks(event), [event]);
  const reportRows = useMemo(
    () => buildAllotmentReport({ hotelBlocks, hotel: event.hotel }, venues, assignments),
    [hotelBlocks, event.hotel, venues, assignments]
  );
  const reportByHotel = useMemo(
    () => groupAllotmentReportByHotel(reportRows),
    [reportRows]
  );
  const [activeHotelId, setActiveHotelId] = useState("");

  const activeId = activeHotelId || reportByHotel[0]?.hotelBlockId || "";
  const activeGroup = reportByHotel.find((group) => group.hotelBlockId === activeId);
  const summary = summarizeAllotmentReport(reportRows);

  return (
    <section className="space-y-4 rounded-xl border border-white/10 bg-[#111111] p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-leanme-fuchsia">
            Report hotel
          </h3>
          <p className="mt-2 text-sm text-white/60">
            Sintesi allotment e assegnazioni camere per hotel e notte.
          </p>
          <p className="mt-1 text-xs text-white/45">{summary}</p>
        </div>
        <div className="w-full min-w-[240px] space-y-2 lg:max-w-md">
          {reportByHotel.length > 0 ? (
            <label className="block text-sm">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-white/45">
                Hotel per export selezionato
              </span>
              <select
                value={activeId}
                onChange={(event) => setActiveHotelId(event.target.value)}
                className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
              >
                {reportByHotel.map((group) => (
                  <option key={group.hotelBlockId} value={group.hotelBlockId}>
                    {group.hotelLabel}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={reportRows.length === 0}
              onClick={() => downloadAllotmentCsv(reportRows, event.title)}
              className="rounded-full bg-leanme-fuchsia px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark disabled:opacity-40"
            >
              Export tutti gli hotel
            </button>
            <button
              type="button"
              disabled={!activeGroup?.rows.length}
              onClick={() => {
                if (activeGroup) {
                  downloadAllotmentCsvForHotel(
                    activeGroup.rows,
                    event.title,
                    activeGroup.hotelLabel
                  );
                }
              }}
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:border-leanme-fuchsia disabled:opacity-40"
            >
              Export hotel selezionato
            </button>
          </div>
          <p className="text-xs text-white/40">
            L&apos;hotel selezionato è quello del menu o del tab evidenziato sotto.
          </p>
        </div>
      </div>

      {reportByHotel.length === 0 ? (
        <p className="text-sm text-white/50">Nessun dato allotment configurato.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {reportByHotel.map((group) => (
              <button
                key={group.hotelBlockId}
                type="button"
                onClick={() => setActiveHotelId(group.hotelBlockId)}
                className={`rounded-full px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] sm:text-[11px] ${
                  activeId === group.hotelBlockId
                    ? "bg-leanme-fuchsia text-white"
                    : "border border-white/20 text-white/70"
                }`}
              >
                {group.hotelLabel}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-sm">
              <thead className="bg-black/50 text-left text-xs uppercase tracking-[0.1em] text-white/45">
                <tr>
                  <th className="px-3 py-2">Notte</th>
                  <th className="px-3 py-2">Tipologia</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Assegn.</th>
                  <th className="px-3 py-2">Disp.</th>
                </tr>
              </thead>
              <tbody>
                {(activeGroup?.rows ?? []).map((row) => (
                  <tr
                    key={`${row.hotelBlockId}-${row.nightAllotmentId}-${row.roomAllotmentId}`}
                    className={`border-t border-white/10 ${row.overbooked ? "bg-red-500/10" : ""}`}
                  >
                    <td className="px-3 py-2 text-white/70">{row.nightDate}</td>
                    <td className="px-3 py-2 text-white/70">{row.roomLabel}</td>
                    <td className="px-3 py-2 text-white/70">{row.quantity}</td>
                    <td className="px-3 py-2 text-white/70">{row.assigned}</td>
                    <td className="px-3 py-2 text-white/70">{row.available}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
