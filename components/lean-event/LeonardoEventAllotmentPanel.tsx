"use client";

import { useEffect, useMemo, useState } from "react";

import {
  appendGeneratedNightsToBlock,
  buildAllotmentReport,
  downloadAllotmentCsv,
  downloadAllotmentCsvForHotel,
  generateNightDatesFromPeriod,
  groupAllotmentReportByHotel,
  summarizeAllotmentReport,
} from "@/lib/lean-event/allotment-report";
import { LeonardoDateInput } from "@/components/lean-event/LeonardoDateInput";
import { LeonardoSearchableVenueSelect } from "@/components/lean-event/LeonardoSearchableVenueSelect";
import { formatVenueLabel } from "@/lib/lean-event/venue-display";
import type { EventAssignmentWithContact } from "@/lib/lean-event/event-assignments";
import {
  emptyHotelBlock,
  emptyNightAllotment,
  emptyRoomAllotment,
  normalizeHotelBlocks,
} from "@/lib/lean-event/event-hotel";
import {
  countAllotmentAssignments,
  formatRoommateSummary,
  listGuestNamesOnRoomAllotment,
  listHospitalityNightStays,
  normalizeAssignmentHospitality,
  roomTypeRequiresRoommate,
  summarizeHotelBlocks,
} from "@/lib/lean-event/hospitality";
import { leanEventLeonardoSediPath } from "@/lib/lean-event/paths";
import type {
  LeonardoEvent,
  LeonardoEventHotelBlock,
  LeonardoNightAllotment,
  LeonardoRoomAllotment,
  LeonardoVenue,
} from "@/types/lean-event";

function uid(): string {
  return crypto.randomUUID();
}

interface LeonardoEventAllotmentPanelProps {
  tenantSlug: string;
  event: LeonardoEvent;
  venues: LeonardoVenue[];
  assignments: EventAssignmentWithContact[];
  onEventSaved: (event: LeonardoEvent) => void;
  onAssignmentsRefresh?: () => void | Promise<void>;
}

export function LeonardoEventAllotmentPanel({
  tenantSlug,
  event,
  venues,
  assignments,
  onEventSaved,
  onAssignmentsRefresh,
}: LeonardoEventAllotmentPanelProps) {
  const [hotelBlocks, setHotelBlocks] = useState<LeonardoEventHotelBlock[]>(() =>
    normalizeHotelBlocks(event)
  );
  const [savingHotel, setSavingHotel] = useState(false);
  const [hotelMessage, setHotelMessage] = useState<string | null>(null);
  const [reportHotelId, setReportHotelId] = useState<string>("");

  useEffect(() => {
    setHotelBlocks(normalizeHotelBlocks(event));
  }, [event]);

  const summary = useMemo(
    () => summarizeHotelBlocks(hotelBlocks, assignments),
    [hotelBlocks, assignments]
  );

  const reportRows = useMemo(
    () =>
      buildAllotmentReport(
        { hotelBlocks, hotel: event.hotel },
        venues,
        assignments
      ),
    [hotelBlocks, event.hotel, venues, assignments]
  );

  const reportSummary = useMemo(
    () => summarizeAllotmentReport(reportRows),
    [reportRows]
  );

  const reportByHotel = useMemo(
    () => groupAllotmentReportByHotel(reportRows),
    [reportRows]
  );

  const activeReportHotelId =
    reportHotelId || reportByHotel[0]?.hotelBlockId || "";

  const activeReportRows = useMemo(() => {
    const group = reportByHotel.find(
      (item) => item.hotelBlockId === activeReportHotelId
    );
    return group?.rows ?? [];
  }, [reportByHotel, activeReportHotelId]);

  async function saveHotelBlocks() {
    setSavingHotel(true);
    setHotelMessage(null);

    const payloadBlocks = hotelBlocks.map((block) => ({
      ...block,
      id: block.id || uid(),
      nightAllotments: block.nightAllotments.map((night) => ({
        ...night,
        id: night.id || uid(),
        roomAllotments: night.roomAllotments.map((allotment) => ({
          ...allotment,
          id: allotment.id || uid(),
        })),
      })),
    }));

    const response = await fetch(`/api/lean-event/events/${event.id}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expectedRevision: event.revision ?? 1,
        hotelBlocks: payloadBlocks,
      }),
    });

    const payload = (await response.json()) as {
      error?: string;
      event?: LeonardoEvent;
      reconciledAssignments?: number;
    };
    setSavingHotel(false);

    if (!response.ok || !payload.event) {
      setHotelMessage(payload.error ?? "Salvataggio allotment non riuscito.");
      return;
    }

    const nextBlocks = normalizeHotelBlocks(payload.event);
    setHotelBlocks(nextBlocks);
    onEventSaved(payload.event);
    await onAssignmentsRefresh?.();
    setHotelMessage(
      (payload.reconciledAssignments ?? 0) > 0
        ? `Allotment salvato. ${payload.reconciledAssignments} scheda/e ospite aggiornata/e (camere scollegate dalle tipologie rimosse).`
        : "Allotment salvato."
    );
  }

  function updateBlock(blockId: string, patch: Partial<LeonardoEventHotelBlock>) {
    setHotelBlocks((current) =>
      current.map((block) =>
        block.id === blockId ? { ...block, ...patch } : block
      )
    );
  }

  function updateNight(
    blockId: string,
    nightId: string,
    patch: Partial<LeonardoNightAllotment>
  ) {
    setHotelBlocks((current) =>
      current.map((block) => {
        if (block.id !== blockId) {
          return block;
        }
        return {
          ...block,
          nightAllotments: block.nightAllotments.map((night) =>
            night.id === nightId ? { ...night, ...patch } : night
          ),
        };
      })
    );
  }

  function updateAllotment(
    blockId: string,
    nightId: string,
    allotmentId: string,
    patch: Partial<LeonardoRoomAllotment>
  ) {
    setHotelBlocks((current) =>
      current.map((block) => {
        if (block.id !== blockId) {
          return block;
        }
        return {
          ...block,
          nightAllotments: block.nightAllotments.map((night) => {
            if (night.id !== nightId) {
              return night;
            }
            return {
              ...night,
              roomAllotments: night.roomAllotments.map((item) =>
                item.id === allotmentId ? { ...item, ...patch } : item
              ),
            };
          }),
        };
      })
    );
  }

  function generateNightsForBlock(blockId: string) {
    const block = hotelBlocks.find((item) => item.id === blockId);
    if (!block) {
      return;
    }
    const dates = generateNightDatesFromPeriod(
      block.checkInDate,
      block.checkOutDate
    );
    if (dates.length === 0) {
      setHotelMessage(
        "Imposta periodo da/a valido (gg/mm/aaaa) prima di generare le notti."
      );
      return;
    }
    setHotelBlocks((current) =>
      current.map((item) =>
        item.id === blockId ? appendGeneratedNightsToBlock(item, dates) : item
      )
    );
    setHotelMessage(`${dates.length} notti generate dal periodo hotel.`);
  }

  return (
    <section className="space-y-6 rounded-xl border border-white/10 bg-[#111111] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-leanme-fuchsia">
            Allotment
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            Configura hotel convenzionati e disponibilità camere{" "}
            <strong>per notte</strong>. Le assegnazioni ai singoli ospiti si
            compilano nel tab Ospiti.
          </p>
          <p className="mt-1 text-xs text-white/45">{summary}</p>
        </div>
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
            disabled={activeReportRows.length === 0}
            onClick={() => {
              const group = reportByHotel.find(
                (item) => item.hotelBlockId === activeReportHotelId
              );
              if (group) {
                downloadAllotmentCsvForHotel(
                  group.rows,
                  event.title,
                  group.hotelLabel
                );
              }
            }}
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:border-leanme-fuchsia disabled:opacity-40"
          >
            Export hotel selezionato
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/45">
            Hotel convenzionati ({hotelBlocks.length})
          </p>
          <div className="flex gap-2">
            <a
              href={leanEventLeonardoSediPath(tenantSlug)}
              className="text-[11px] font-semibold uppercase tracking-[0.08em] text-leanme-fuchsia hover:underline"
            >
              Rubrica sedi
            </a>
            <button
              type="button"
              onClick={() =>
                setHotelBlocks((current) => [
                  ...current,
                  emptyHotelBlock({ id: uid() }),
                ])
              }
              className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white hover:border-leanme-fuchsia"
            >
              + Hotel
            </button>
          </div>
        </div>

        {hotelBlocks.length === 0 ? (
          <p className="text-sm text-white/50">
            Nessun hotel configurato. Aggiungi un hotel, imposta il periodo e
            genera le notti con i preset DUS, DBL, MAT…
          </p>
        ) : (
          hotelBlocks.map((block, index) => {
            const venue = block.venueId
              ? venues.find((item) => item.id === block.venueId)
              : null;
            return (
              <div
                key={block.id}
                className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white">
                    {venue ? formatVenueLabel(venue) : `Hotel ${index + 1}`}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setHotelBlocks((current) =>
                        current.filter((item) => item.id !== block.id)
                      )
                    }
                    className="text-xs text-white/45 hover:text-red-300"
                  >
                    Rimuovi
                  </button>
                </div>

                <LeonardoSearchableVenueSelect
                  venues={venues}
                  value={block.venueId}
                  onChange={(venueId) => updateBlock(block.id, { venueId })}
                  emptyLabel="Cerca hotel da rubrica"
                />

                <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs text-white/55">
                      Periodo da
                    </span>
                    <LeonardoDateInput
                      value={block.checkInDate}
                      onChange={(checkInDate) =>
                        updateBlock(block.id, { checkInDate })
                      }
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs text-white/55">
                      Periodo a
                    </span>
                    <LeonardoDateInput
                      value={block.checkOutDate}
                      onChange={(checkOutDate) =>
                        updateBlock(block.id, { checkOutDate })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => generateNightsForBlock(block.id)}
                    className="rounded-full border border-white/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:border-leanme-fuchsia"
                  >
                    Genera notti
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/45">
                      Allotment per notte ({block.nightAllotments.length})
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateBlock(block.id, {
                          nightAllotments: [
                            ...block.nightAllotments,
                            emptyNightAllotment({ id: uid() }),
                          ],
                        })
                      }
                      className="text-[11px] font-semibold uppercase tracking-[0.08em] text-leanme-fuchsia"
                    >
                      + Notte
                    </button>
                  </div>

                  {block.nightAllotments.length === 0 ? (
                    <p className="text-xs text-white/45">
                      Imposta il periodo e clicca «Genera notti», oppure aggiungi
                      una notte singola.
                    </p>
                  ) : (
                    block.nightAllotments.map((night) => (
                      <div
                        key={night.id}
                        className="space-y-2 rounded-lg border border-white/10 bg-black/40 p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <LeonardoDateInput
                            value={night.nightDate}
                            onChange={(nightDate) =>
                              updateNight(block.id, night.id, { nightDate })
                            }
                            className="min-w-[140px] flex-1 rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateBlock(block.id, {
                                nightAllotments: block.nightAllotments.filter(
                                  (item) => item.id !== night.id
                                ),
                              })
                            }
                            className="text-xs text-white/40 hover:text-red-300"
                          >
                            Rimuovi notte
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateNight(block.id, night.id, {
                                roomAllotments: [
                                  ...night.roomAllotments,
                                  emptyRoomAllotment({ id: uid() }),
                                ],
                              })
                            }
                            className="text-[11px] font-semibold uppercase tracking-[0.08em] text-leanme-fuchsia"
                          >
                            + Tipologia
                          </button>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="text-left text-xs uppercase tracking-[0.1em] text-white/45">
                              <tr>
                                <th className="px-2 py-1">Codice</th>
                                <th className="px-2 py-1">Tipologia</th>
                                <th className="px-2 py-1">Qty</th>
                                <th className="px-2 py-1">Assegnate</th>
                                <th className="px-2 py-1">Disp.</th>
                                <th className="hidden px-2 py-1 lg:table-cell">
                                  Ospiti / compagno
                                </th>
                                <th className="px-2 py-1" />
                              </tr>
                            </thead>
                            <tbody>
                              {night.roomAllotments.map((allotment) => {
                                const used = countAllotmentAssignments(
                                  assignments,
                                  block.id,
                                  night.id,
                                  allotment.id
                                );
                                const available = Math.max(
                                  0,
                                  allotment.quantity - used
                                );
                                const overbooked =
                                  allotment.quantity > 0 && used > allotment.quantity;
                                const guests = assignments
                                  .filter((assignment) => {
                                    const stays = listHospitalityNightStays(
                                      normalizeAssignmentHospitality(
                                        assignment.hospitality
                                      )
                                    );
                                    return stays.some(
                                      (stay) =>
                                        stay.hotelBlockId === block.id &&
                                        stay.nightAllotmentId === night.id &&
                                        stay.roomAllotmentId === allotment.id
                                    );
                                  })
                                  .map((assignment) => {
                                    const roommate = formatRoommateSummary(
                                      assignment.hospitality
                                    );
                                    const needsCompanion = roomTypeRequiresRoommate(
                                      allotment
                                    );
                                    if (needsCompanion && roommate) {
                                      return `${assignment.contactName} + ${roommate}`;
                                    }
                                    if (needsCompanion && !roommate) {
                                      return `${assignment.contactName} (compagno da indicare)`;
                                    }
                                    return assignment.contactName;
                                  });

                                return (
                                  <tr
                                    key={allotment.id}
                                    className={`border-t border-white/10 ${overbooked ? "bg-red-500/10" : ""}`}
                                  >
                                    <td className="px-2 py-1.5">
                                      <input
                                        value={allotment.code}
                                        onChange={(event) =>
                                          updateAllotment(
                                            block.id,
                                            night.id,
                                            allotment.id,
                                            {
                                              code: event.target.value.toUpperCase(),
                                            }
                                          )
                                        }
                                        className="w-20 rounded border border-white/15 bg-black px-2 py-1 text-xs uppercase"
                                      />
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <input
                                        value={allotment.label}
                                        onChange={(event) =>
                                          updateAllotment(
                                            block.id,
                                            night.id,
                                            allotment.id,
                                            { label: event.target.value }
                                          )
                                        }
                                        className="w-full min-w-[140px] rounded border border-white/15 bg-black px-2 py-1 text-xs"
                                      />
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <input
                                        type="number"
                                        min={0}
                                        value={allotment.quantity || ""}
                                        onChange={(event) =>
                                          updateAllotment(
                                            block.id,
                                            night.id,
                                            allotment.id,
                                            {
                                              quantity:
                                                Number(event.target.value) || 0,
                                            }
                                          )
                                        }
                                        className="w-16 rounded border border-white/15 bg-black px-2 py-1 text-xs"
                                      />
                                    </td>
                                    <td
                                      className={`px-2 py-1.5 text-xs ${overbooked ? "font-semibold text-red-300" : "text-white/60"}`}
                                    >
                                      {used}
                                      {allotment.quantity > 0
                                        ? ` / ${allotment.quantity}`
                                        : ""}
                                    </td>
                                    <td className="px-2 py-1.5 text-xs text-white/60">
                                      {available}
                                    </td>
                                    <td className="hidden max-w-[200px] truncate px-2 py-1.5 text-xs text-white/45 lg:table-cell">
                                      {guests.length > 0
                                        ? guests.join(", ")
                                        : "—"}
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const guests =
                                            listGuestNamesOnRoomAllotment(
                                              assignments,
                                              block.id,
                                              night.id,
                                              allotment.id
                                            );
                                          if (guests.length > 0) {
                                            const proceed = window.confirm(
                                              `Tipologia ${allotment.code || allotment.label} assegnata a: ${guests.join(", ")}.\n\nRimuovere la tipologia scollega le camere dagli ospiti ma NON li toglie dall'evento.\nPer rimuovere un ospite usa la tab Ospiti → Rimuovi.\n\nContinuare?`
                                            );
                                            if (!proceed) {
                                              return;
                                            }
                                          }
                                          updateNight(block.id, night.id, {
                                            roomAllotments:
                                              night.roomAllotments.filter(
                                                (item) => item.id !== allotment.id
                                              ),
                                          });
                                        }}
                                        title="Rimuovi tipologia camera"
                                        aria-label={`Rimuovi tipologia ${allotment.code || allotment.label}`}
                                        className="rounded border border-white/10 px-1.5 py-0.5 text-xs text-white/40 hover:border-red-400/40 hover:text-red-300"
                                      >
                                        Tip.
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <textarea
                  rows={2}
                  placeholder="Note hotel (referente, condizioni, cut-off…)"
                  value={block.notes}
                  onChange={(event) =>
                    updateBlock(block.id, { notes: event.target.value })
                  }
                  className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
                />
              </div>
            );
          })
        )}

        {hotelMessage ? (
          <p className="text-sm text-leanme-fuchsia">{hotelMessage}</p>
        ) : null}
        <button
          type="button"
          disabled={savingHotel}
          onClick={saveHotelBlocks}
          className="rounded-full bg-leanme-fuchsia px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark disabled:opacity-60"
        >
          {savingHotel ? "Salvataggio…" : "Salva allotment"}
        </button>
      </div>

      {reportByHotel.length > 0 ? (
        <div className="space-y-3 border-t border-white/10 pt-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/45">
              Report allotment per hotel
            </p>
            <p className="mt-1 text-xs text-white/45">{reportSummary}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {reportByHotel.map((group) => (
              <button
                key={group.hotelBlockId}
                type="button"
                onClick={() => setReportHotelId(group.hotelBlockId)}
                className={`rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] transition ${
                  activeReportHotelId === group.hotelBlockId
                    ? "bg-leanme-fuchsia text-white"
                    : "border border-white/20 text-white/70 hover:border-leanme-fuchsia"
                }`}
              >
                {group.hotelLabel} ({group.rows.length})
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
                  <th className="hidden px-3 py-2 lg:table-cell">Ospiti</th>
                </tr>
              </thead>
              <tbody>
                {activeReportRows.map((row) => (
                  <tr
                    key={`${row.hotelBlockId}-${row.nightAllotmentId}-${row.roomAllotmentId}`}
                    className={`border-t border-white/10 ${row.overbooked ? "bg-red-500/10" : "bg-[#111111]"}`}
                  >
                    <td className="px-3 py-2 text-white/70">{row.nightDate}</td>
                    <td className="px-3 py-2 text-white/70">{row.roomLabel}</td>
                    <td className="px-3 py-2 text-white/70">{row.quantity}</td>
                    <td className="px-3 py-2 text-white/70">{row.assigned}</td>
                    <td className="px-3 py-2 text-white/70">{row.available}</td>
                    <td className="hidden max-w-[240px] truncate px-3 py-2 text-xs text-white/45 lg:table-cell">
                      {row.guestNames.length > 0
                        ? row.guestNames.join(", ")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
