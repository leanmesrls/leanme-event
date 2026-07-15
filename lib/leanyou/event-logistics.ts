import {
  formatAllotmentLabel,
  formatNightLabel,
} from "@/lib/leanyou/event-hotel";
import {
  carTravelTimeField,
  listHospitalityNightStays,
  normalizeAssignmentHospitality,
  TRAVEL_DIRECTION_LABELS,
  TRAVEL_MODE_LABELS,
} from "@/lib/leanyou/hospitality";
import {
  buildTransferGroupingSuggestions,
  formatTransferTimeLabel,
  resolveTransferTimes,
  type TransferGroupingSuggestion,
} from "@/lib/leanyou/transfer";
import { formatVenueLabel } from "@/lib/leanyou/venue-display";
import type { EventAssignmentWithContact } from "@/lib/leanyou/event-assignments";
import type {
  LeonardoEventHotelBlock,
  LeonardoTravelDirection,
  LeonardoTravelMode,
  LeonardoTravelSegment,
  LeonardoVenue,
} from "@/types/leanyou";

export interface EventLogisticsManifestRow {
  assignmentId: string;
  contactId: string;
  contactName: string;
  roleLabel: string;
  hotelLabel: string;
  roomLabel: string;
  transferIn: boolean;
  transferOut: boolean;
  transferInTime: string;
  transferOutTime: string;
  transferInTimeLabel: string;
  transferOutTimeLabel: string;
  segmentId: string;
  direction: LeonardoTravelDirection;
  directionLabel: string;
  mode: LeonardoTravelMode;
  modeLabel: string;
  carrier: string;
  originLabel: string;
  destinationLabel: string;
  scheduleLabel: string;
  sortKey: string;
}

export interface EventLogisticsSummary {
  guestCount: number;
  transferCount: number;
  travelLegCount: number;
  pendingTravelCount: number;
  transferGroupCount: number;
}

function formatScheduleLabel(segment: LeonardoTravelSegment): string {
  if (segment.mode === "car") {
    const field = carTravelTimeField(segment.direction);
    const value = segment[field]?.trim();
    return value ? formatDateTimeValue(value) : "—";
  }

  const parts = [
    segment.departureAt.trim()
      ? `Part. ${formatDateTimeValue(segment.departureAt)}`
      : "",
    segment.arrivalAt.trim()
      ? `Arr. ${formatDateTimeValue(segment.arrivalAt)}`
      : "",
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "—";
}

function formatDateTimeValue(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function travelSortKey(segment: LeonardoTravelSegment): string {
  if (segment.mode === "car") {
    return segment[carTravelTimeField(segment.direction)] || "9999";
  }
  return segment.departureAt || segment.arrivalAt || "9999";
}

function resolveOriginDestination(segment: LeonardoTravelSegment): {
  origin: string;
  destination: string;
} {
  if (segment.mode === "train") {
    return {
      origin: segment.originCity.trim() || "—",
      destination: "—",
    };
  }
  if (segment.mode === "flight") {
    return {
      origin: segment.originAirport.trim() || "—",
      destination: segment.destinationAirport.trim() || "—",
    };
  }
  return { origin: "—", destination: "—" };
}

function resolveRoomLabels(
  hotelBlocks: LeonardoEventHotelBlock[],
  venues: LeonardoVenue[],
  assignment: EventAssignmentWithContact
): { hotelLabel: string; roomLabel: string } {
  const hospitality = normalizeAssignmentHospitality(assignment.hospitality);
  const stays = listHospitalityNightStays(hospitality);

  if (stays.length === 0) {
    return { hotelLabel: "—", roomLabel: hospitality.roomTypeCode || "—" };
  }

  const labels = stays.map((stay) => {
    const block = hotelBlocks.find((item) => item.id === stay.hotelBlockId);
    const night = block?.nightAllotments.find(
      (item) => item.id === stay.nightAllotmentId
    );
    const allotment = night?.roomAllotments.find(
      (item) => item.id === stay.roomAllotmentId
    );
    const venue = block?.venueId
      ? venues.find((item) => item.id === block.venueId)
      : null;
    const hotelLabel = venue
      ? formatVenueLabel(venue)
      : block
        ? "Hotel non collegato"
        : "—";
    const roomLabel = allotment
      ? `${stay.nightDate || formatNightLabel(night!)} · ${formatAllotmentLabel(allotment)}`
      : stay.roomTypeCode || "—";
    return { hotelLabel, roomLabel };
  });

  const uniqueHotels = [...new Set(labels.map((item) => item.hotelLabel))];
  return {
    hotelLabel: uniqueHotels.join(" · "),
    roomLabel: labels.map((item) => item.roomLabel).join(" | "),
  };
}

function primaryTravelMode(
  travels: LeonardoTravelSegment[]
): { mode: LeonardoTravelMode; modeLabel: string } {
  const outbound = travels.find((segment) => segment.direction === "outbound");
  const first = outbound ?? travels[0];
  if (!first) {
    return { mode: "other", modeLabel: "—" };
  }
  return {
    mode: first.mode,
    modeLabel: TRAVEL_MODE_LABELS[first.mode],
  };
}

export function buildEventLogisticsManifest(
  assignments: EventAssignmentWithContact[],
  hotelBlocks: LeonardoEventHotelBlock[],
  venues: LeonardoVenue[]
): EventLogisticsManifestRow[] {
  const rows: EventLogisticsManifestRow[] = [];

  for (const assignment of assignments) {
    const hospitality = normalizeAssignmentHospitality(assignment.hospitality);
    const { hotelLabel, roomLabel } = resolveRoomLabels(
      hotelBlocks,
      venues,
      assignment
    );
    const transferTimes = resolveTransferTimes(hospitality);

    if (hospitality.travels.length === 0) {
      rows.push({
        assignmentId: assignment.id,
        contactId: assignment.contactId,
        contactName: assignment.contactName,
        roleLabel: assignment.roleLabel,
        hotelLabel,
        roomLabel,
        transferIn: hospitality.transferIn,
        transferOut: hospitality.transferOut,
        transferInTime: transferTimes.transferInTime,
        transferOutTime: transferTimes.transferOutTime,
        transferInTimeLabel: formatTransferTimeLabel(transferTimes.transferInTime),
        transferOutTimeLabel: formatTransferTimeLabel(transferTimes.transferOutTime),
        segmentId: "",
        direction: "outbound",
        directionLabel: "—",
        mode: "other",
        modeLabel: "—",
        carrier: "",
        originLabel: "—",
        destinationLabel: "—",
        scheduleLabel: "Nessuna tratta",
        sortKey: "9999",
      });
      continue;
    }

    for (const segment of hospitality.travels) {
      const { origin, destination } = resolveOriginDestination(segment);
      rows.push({
        assignmentId: assignment.id,
        contactId: assignment.contactId,
        contactName: assignment.contactName,
        roleLabel: assignment.roleLabel,
        hotelLabel,
        roomLabel,
        transferIn: hospitality.transferIn,
        transferOut: hospitality.transferOut,
        transferInTime: transferTimes.transferInTime,
        transferOutTime: transferTimes.transferOutTime,
        transferInTimeLabel: formatTransferTimeLabel(transferTimes.transferInTime),
        transferOutTimeLabel: formatTransferTimeLabel(transferTimes.transferOutTime),
        segmentId: segment.id,
        direction: segment.direction,
        directionLabel: TRAVEL_DIRECTION_LABELS[segment.direction],
        mode: segment.mode,
        modeLabel: TRAVEL_MODE_LABELS[segment.mode],
        carrier: segment.carrier.trim(),
        originLabel: origin,
        destinationLabel: destination,
        scheduleLabel: formatScheduleLabel(segment),
        sortKey: travelSortKey(segment),
      });
    }
  }

  return rows.sort((a, b) => {
    const byTime = a.sortKey.localeCompare(b.sortKey);
    if (byTime !== 0) {
      return byTime;
    }
    return a.contactName.localeCompare(b.contactName, "it");
  });
}

export function buildLogisticsTransferSuggestions(
  assignments: EventAssignmentWithContact[]
): TransferGroupingSuggestion[] {
  const items = assignments.map((assignment) => {
    const hospitality = normalizeAssignmentHospitality(assignment.hospitality);
    const transferTimes = resolveTransferTimes(hospitality);
    const { mode, modeLabel } = primaryTravelMode(hospitality.travels);
    return {
      contactName: assignment.contactName,
      transferIn: hospitality.transferIn,
      transferOut: hospitality.transferOut,
      transferInTime: transferTimes.transferInTime,
      transferOutTime: transferTimes.transferOutTime,
      primaryMode: mode,
      primaryModeLabel: modeLabel,
    };
  });
  return buildTransferGroupingSuggestions(items);
}

export function summarizeEventLogistics(
  assignments: EventAssignmentWithContact[],
  manifest: EventLogisticsManifestRow[]
): EventLogisticsSummary {
  const transferCount = assignments.filter((assignment) => {
    const hospitality = normalizeAssignmentHospitality(assignment.hospitality);
    return hospitality.transferIn || hospitality.transferOut;
  }).length;

  const travelLegCount = manifest.filter((row) => row.segmentId).length;
  const pendingTravelCount = manifest.filter(
    (row) => !row.segmentId || row.scheduleLabel === "—" || row.scheduleLabel === "Nessuna tratta"
  ).length;

  return {
    guestCount: assignments.length,
    transferCount,
    travelLegCount,
    pendingTravelCount,
    transferGroupCount: buildLogisticsTransferSuggestions(assignments).length,
  };
}

export function filterLogisticsManifest(
  manifest: EventLogisticsManifestRow[],
  filters: {
    query?: string;
    transferOnly?: boolean;
    mode?: LeonardoTravelMode | "";
    direction?: LeonardoTravelDirection | "";
  }
): EventLogisticsManifestRow[] {
  const query = filters.query?.trim().toLowerCase() ?? "";

  return manifest.filter((row) => {
    if (filters.transferOnly && !row.transferIn && !row.transferOut) {
      return false;
    }
    if (filters.mode && row.mode !== filters.mode) {
      return false;
    }
    if (filters.direction && row.direction !== filters.direction) {
      return false;
    }
    if (!query) {
      return true;
    }

    const haystack = [
      row.contactName,
      row.roleLabel,
      row.hotelLabel,
      row.roomLabel,
      row.modeLabel,
      row.directionLabel,
      row.carrier,
      row.originLabel,
      row.destinationLabel,
      row.scheduleLabel,
      row.transferInTimeLabel,
      row.transferOutTimeLabel,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function logisticsManifestToCsv(rows: EventLogisticsManifestRow[]): string {
  const header = [
    "Ospite",
    "Ruolo",
    "Hotel",
    "Camera",
    "Direzione",
    "Mezzo",
    "Orari",
    "Provenienza",
    "Destinazione",
    "Vettore",
    "Transfer arrivo",
    "Orario transfer arr.",
    "Transfer partenza",
    "Orario transfer part.",
  ];

  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;

  const lines = rows.map((row) =>
    [
      row.contactName,
      row.roleLabel,
      row.hotelLabel,
      row.roomLabel,
      row.directionLabel,
      row.modeLabel,
      row.scheduleLabel,
      row.originLabel,
      row.destinationLabel,
      row.carrier,
      row.transferIn ? "Sì" : "No",
      row.transferInTimeLabel,
      row.transferOut ? "Sì" : "No",
      row.transferOutTimeLabel,
    ]
      .map(escape)
      .join(";")
  );

  return [header.map(escape).join(";"), ...lines].join("\n");
}

export function transferSuggestionsToCsv(
  suggestions: TransferGroupingSuggestion[]
): string {
  const header = [
    "Direzione",
    "Orario transfer",
    "Mezzo",
    "N. ospiti",
    "Ospiti",
    "Suggerimento",
  ];
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;

  const lines = suggestions.map((group) =>
    [
      group.direction === "in" ? "Arrivo" : "Partenza",
      group.transferTimeLabel,
      group.modeLabel,
      String(group.guestCount),
      group.guestNames.join(", "),
      `Valuta un unico mezzo per ${group.guestCount} ospiti (${group.modeLabel}) alle ${group.transferTimeLabel}`,
    ]
      .map(escape)
      .join(";")
  );

  return [header.map(escape).join(";"), ...lines].join("\n");
}

export function downloadLogisticsCsv(
  rows: EventLogisticsManifestRow[],
  eventTitle: string
): void {
  const csv = logisticsManifestToCsv(rows);
  const blob = new Blob(["\uFEFF", csv], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `logistica-${eventTitle.replace(/[^\w\-]+/g, "-").slice(0, 40).toLowerCase()}.xls`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadTransferSuggestionsCsv(
  suggestions: TransferGroupingSuggestion[],
  eventTitle: string
): void {
  const csv = transferSuggestionsToCsv(suggestions);
  const blob = new Blob(["\uFEFF", csv], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `transfer-gruppi-${eventTitle.replace(/[^\w\-]+/g, "-").slice(0, 40).toLowerCase()}.xls`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export type { TransferGroupingSuggestion };
