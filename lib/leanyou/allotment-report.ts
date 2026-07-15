import type { EventAssignmentWithContact } from "@/lib/leanyou/event-assignments";
import { parseItalianDate, formatItalianDate } from "@/lib/leanyou/dates";
import {
  emptyNightAllotment,
  formatAllotmentLabel,
  formatNightLabel,
  normalizeHotelBlocks,
} from "@/lib/leanyou/event-hotel";
import {
  countAllotmentAssignments,
  listHospitalityNightStays,
  normalizeAssignmentHospitality,
} from "@/lib/leanyou/hospitality";
import { formatVenueLabel } from "@/lib/leanyou/venue-display";
import type {
  LeonardoAssignmentHospitality,
  LeonardoEvent,
  LeonardoEventHotelBlock,
  LeonardoVenue,
} from "@/types/leanyou";

export interface AllotmentReportRow {
  hotelBlockId: string;
  nightAllotmentId: string;
  roomAllotmentId: string;
  hotelLabel: string;
  nightDate: string;
  roomCode: string;
  roomLabel: string;
  quantity: number;
  assigned: number;
  available: number;
  overbooked: boolean;
  guestNames: string[];
}

function parseItalianDateLocal(value: string): Date | null {
  return parseItalianDate(value);
}

function formatItalianDateLocal(date: Date): string {
  return formatItalianDate(date);
}

export function generateNightDatesFromPeriod(
  checkInDate: string,
  checkOutDate: string
): string[] {
  const start = parseItalianDateLocal(checkInDate);
  const end = parseItalianDateLocal(checkOutDate);
  if (!start || !end || end <= start) {
    return [];
  }

  const nights: string[] = [];
  const cursor = new Date(start);
  while (cursor < end) {
    nights.push(formatItalianDateLocal(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return nights;
}

export function appendGeneratedNightsToBlock(
  block: LeonardoEventHotelBlock,
  dates: string[]
): LeonardoEventHotelBlock {
  const existingDates = new Set(
    block.nightAllotments.map((night) => night.nightDate.trim()).filter(Boolean)
  );

  const newNights = dates
    .filter((date) => !existingDates.has(date))
    .map((nightDate) =>
      emptyNightAllotment({
        id: crypto.randomUUID(),
        nightDate,
      })
    );

  return {
    ...block,
    nightAllotments: [...block.nightAllotments, ...newNights],
  };
}

export function buildAllotmentReport(
  event: Pick<LeonardoEvent, "hotelBlocks" | "hotel">,
  venues: LeonardoVenue[],
  assignments: EventAssignmentWithContact[]
): AllotmentReportRow[] {
  const blocks = normalizeHotelBlocks(event);
  const rows: AllotmentReportRow[] = [];

  for (const block of blocks) {
    const venue = block.venueId
      ? venues.find((item) => item.id === block.venueId)
      : null;
    const hotelLabel = venue ? formatVenueLabel(venue) : "Hotel non collegato";

    for (const night of block.nightAllotments) {
      if (!night.nightDate.trim()) {
        continue;
      }
      for (const allotment of night.roomAllotments) {
        const assignedGuests = assignments.filter((assignment) => {
          const hospitality = normalizeAssignmentHospitality(
            assignment.hospitality
          );
          return listHospitalityNightStays(hospitality).some(
            (stay) =>
              stay.hotelBlockId === block.id &&
              stay.nightAllotmentId === night.id &&
              stay.roomAllotmentId === allotment.id
          );
        });

        const assigned = assignedGuests.length;
        const quantity = allotment.quantity;
        const available = Math.max(0, quantity - assigned);

        rows.push({
          hotelBlockId: block.id,
          nightAllotmentId: night.id,
          roomAllotmentId: allotment.id,
          hotelLabel,
          nightDate: formatNightLabel(night),
          roomCode: allotment.code,
          roomLabel: formatAllotmentLabel(allotment),
          quantity,
          assigned,
          available,
          overbooked: quantity > 0 && assigned > quantity,
          guestNames: assignedGuests.map((item) => item.contactName),
        });
      }
    }
  }

  return rows.sort((a, b) => {
    const byHotel = a.hotelLabel.localeCompare(b.hotelLabel, "it");
    if (byHotel !== 0) {
      return byHotel;
    }
    const byNight = a.nightDate.localeCompare(b.nightDate, "it");
    if (byNight !== 0) {
      return byNight;
    }
    return a.roomCode.localeCompare(b.roomCode, "it");
  });
}

export function validateAllotmentAssignment(
  event: Pick<LeonardoEvent, "hotelBlocks" | "hotel">,
  assignments: Array<{
    id: string;
    hospitality?: LeonardoAssignmentHospitality | null;
  }>,
  assignmentId: string,
  hospitality: LeonardoAssignmentHospitality
): { ok: true } | { ok: false; message: string } {
  const normalized = normalizeAssignmentHospitality(hospitality);
  const stays = listHospitalityNightStays(normalized);

  if (stays.length === 0) {
    return { ok: true };
  }

  const blocks = normalizeHotelBlocks(event);

  for (const stay of stays) {
    const block = blocks.find((item) => item.id === stay.hotelBlockId);
    const night = block?.nightAllotments.find(
      (item) => item.id === stay.nightAllotmentId
    );
    const allotment = night?.roomAllotments.find(
      (item) => item.id === stay.roomAllotmentId
    );

    if (!block || !night || !allotment) {
      return {
        ok: false,
        message: "Allotment selezionato non valido per questo evento.",
      };
    }

    if (allotment.quantity <= 0) {
      return {
        ok: false,
        message: `Nessuna camera disponibile per ${allotment.code || allotment.label} · ${formatNightLabel(night)}.`,
      };
    }

    const used = countAllotmentAssignments(
      assignments.filter((item) => item.id !== assignmentId),
      stay.hotelBlockId,
      stay.nightAllotmentId,
      stay.roomAllotmentId
    );

    if (used >= allotment.quantity) {
      return {
        ok: false,
        message: `Allotment esaurito: ${allotment.code || allotment.label} · ${formatNightLabel(night)} (${used}/${allotment.quantity}).`,
      };
    }
  }

  return { ok: true };
}

export function allotmentReportToCsv(rows: AllotmentReportRow[]): string {
  const header = [
    "Hotel",
    "Notte",
    "Codice",
    "Tipologia",
    "Qty",
    "Assegnate",
    "Disponibili",
    "Ospiti",
  ];

  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;

  const lines = rows.map((row) =>
    [
      row.hotelLabel,
      row.nightDate,
      row.roomCode,
      row.roomLabel,
      String(row.quantity),
      String(row.assigned),
      String(row.available),
      row.guestNames.join(", "),
    ]
      .map(escape)
      .join(";")
  );

  return [header.map(escape).join(";"), ...lines].join("\n");
}

export function groupAllotmentReportByHotel(
  rows: AllotmentReportRow[]
): Array<{ hotelBlockId: string; hotelLabel: string; rows: AllotmentReportRow[] }> {
  const map = new Map<
    string,
    { hotelBlockId: string; hotelLabel: string; rows: AllotmentReportRow[] }
  >();

  for (const row of rows) {
    if (!row.hotelBlockId) {
      continue;
    }
    const existing = map.get(row.hotelBlockId);
    if (existing) {
      existing.rows.push(row);
    } else {
      map.set(row.hotelBlockId, {
        hotelBlockId: row.hotelBlockId,
        hotelLabel: row.hotelLabel,
        rows: [row],
      });
    }
  }

  return [...map.values()].sort((a, b) =>
    a.hotelLabel.localeCompare(b.hotelLabel, "it")
  );
}

export function downloadAllotmentCsv(rows: AllotmentReportRow[], eventTitle: string) {
  downloadAllotmentFile(rows, eventTitle, "allotment");
}

export function downloadAllotmentCsvForHotel(
  rows: AllotmentReportRow[],
  eventTitle: string,
  hotelLabel: string
) {
  const slug = hotelLabel.replace(/[^\w\-]+/g, "-").slice(0, 40).toLowerCase();
  downloadAllotmentFile(rows, eventTitle, `allotment-${slug}`);
}

function downloadAllotmentFile(
  rows: AllotmentReportRow[],
  eventTitle: string,
  prefix: string
) {
  const csv = allotmentReportToCsv(rows);
  const blob = new Blob(["\uFEFF", csv], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${prefix}-${eventTitle.replace(/[^\w\-]+/g, "-").slice(0, 40).toLowerCase()}.xls`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function summarizeAllotmentReport(rows: AllotmentReportRow[]): string {
  if (rows.length === 0) {
    return "Nessuna riga allotment";
  }
  const totalQty = rows.reduce((sum, row) => sum + row.quantity, 0);
  const totalAssigned = rows.reduce((sum, row) => sum + row.assigned, 0);
  const overbooked = rows.filter((row) => row.overbooked).length;
  return `${rows.length} righe · ${totalQty} camere · ${totalAssigned} assegnate${overbooked ? ` · ${overbooked} in overbooking` : ""}`;
}
