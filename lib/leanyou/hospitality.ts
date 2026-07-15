import {
  formatCompanionName,
  splitLegacyPersonName,
} from "@/lib/leanyou/companion";
import {
  migrateLegacyNightStay,
  syncLegacyHospitalityFields,
} from "@/lib/leanyou/night-stays";
import type {
  LeonardoAssignmentHospitality,
  LeonardoEventHotelBlock,
  LeonardoHospitalityStatus,
  LeonardoNightStay,
  LeonardoRoomAllotment,
  LeonardoTravelDirection,
  LeonardoTravelMode,
  LeonardoTravelSegment,
} from "@/types/leanyou";
import { resolveTransferTimes } from "@/lib/leanyou/transfer";

export const HOSPITALITY_STATUS_LABELS: Record<
  LeonardoHospitalityStatus,
  string
> = {
  pending: "Da compilare",
  requested: "Richiesta inviata",
  confirmed: "Confermato",
  declined: "Non richiesto",
};

export const DEFAULT_ROOM_ALLOTMENT_PRESETS: Array<{
  code: string;
  label: string;
}> = [
  { code: "DUS", label: "Doppia Uso Singola" },
  { code: "DBL", label: "Doppia" },
  { code: "MAT", label: "Matrimoniale" },
  { code: "SGL", label: "Singola" },
  { code: "STE", label: "Suite" },
  { code: "JSTE", label: "Junior Suite" },
];

export const TRAVEL_MODE_LABELS: Record<LeonardoTravelMode, string> = {
  train: "Treno",
  flight: "Aereo",
  car: "Auto",
  other: "Altro",
};

export const TRAVEL_DIRECTION_LABELS: Record<LeonardoTravelDirection, string> =
  {
    outbound: "Andata",
    return: "Ritorno",
  };

export const LOYALTY_PROGRAM_OPTIONS = [
  "CartaFreccia (Trenitalia)",
  "Italo Più",
  "Frequent Flyer",
  "Miles&More",
  "Volare (ITA Airways)",
  "Altro",
] as const;

export const LOYALTY_PROGRAMS_BY_MODE: Record<
  LeonardoTravelMode,
  readonly string[]
> = {
  train: ["CartaFreccia (Trenitalia)", "Italo Più", "Altro"],
  flight: ["Frequent Flyer", "Miles&More", "Volare (ITA Airways)", "Altro"],
  car: [],
  other: LOYALTY_PROGRAM_OPTIONS,
};

export function travelModeSupportsLoyalty(mode: LeonardoTravelMode): boolean {
  return LOYALTY_PROGRAMS_BY_MODE[mode].length > 0;
}

export function travelModeSupportsDocuments(mode: LeonardoTravelMode): boolean {
  return mode === "flight";
}

export function carTravelTimeField(
  direction: LeonardoTravelDirection
): "arrivalAt" | "departureAt" {
  return direction === "outbound" ? "arrivalAt" : "departureAt";
}

export function carTravelTimeLabel(
  direction: LeonardoTravelDirection
): string {
  return direction === "outbound"
    ? "Orario presunto di arrivo"
    : "Orario presunto di partenza";
}

export const ROOMMATE_ROLE_LABELS = {
  participant: "Partecipante all'evento",
  companion_only: "Solo accompagnatore",
} as const;

export function emptyTravelSegment(
  partial?: Partial<LeonardoTravelSegment>
): LeonardoTravelSegment {
  return {
    id: partial?.id ?? "",
    direction: partial?.direction ?? "outbound",
    mode: partial?.mode ?? "train",
    carrier: partial?.carrier?.trim() ?? "",
    loyaltyProgram: partial?.loyaltyProgram?.trim() ?? "",
    loyaltyCode: partial?.loyaltyCode?.trim() ?? "",
    originCity: partial?.originCity?.trim() ?? "",
    originAirport: partial?.originAirport?.trim() ?? "",
    destinationCity: partial?.destinationCity?.trim() ?? "",
    destinationAirport: partial?.destinationAirport?.trim() ?? "",
    departureAt: partial?.departureAt?.trim() ?? "",
    arrivalAt: partial?.arrivalAt?.trim() ?? "",
    documentUrl: partial?.documentUrl?.trim() ?? "",
    documentFrontUrl: partial?.documentFrontUrl?.trim() ?? "",
    documentBackUrl: partial?.documentBackUrl?.trim() ?? "",
    notes: partial?.notes?.trim() ?? "",
  };
}

export function emptyAssignmentHospitality(): LeonardoAssignmentHospitality {
  return {
    status: "pending",
    hotelBlockId: "",
    nightAllotmentId: "",
    roomAllotmentId: "",
    roomTypeCode: "",
    checkIn: "",
    checkOut: "",
    nightStays: [],
    roommateContactId: null,
    roommateFirstName: "",
    roommateLastName: "",
    roommatePhone: "",
    roommateEmail: "",
    roommateName: "",
    roommateRole: null,
    transferIn: false,
    transferOut: false,
    transferInMinutesAfter: 30,
    transferOutMinutesBefore: 30,
    transferInTime: "",
    transferInTimeManual: false,
    transferOutTime: "",
    transferOutTimeManual: false,
    transferNotes: "",
    dietaryRequirements: "",
    allergies: "",
    accessibilityNotes: "",
    internalNotes: "",
    travels: [],
  };
}

export function normalizeTravelSegment(
  segment?: Partial<LeonardoTravelSegment> | null
): LeonardoTravelSegment {
  return emptyTravelSegment(segment ?? undefined);
}

export function normalizeAssignmentHospitality(
  hospitality?: Partial<LeonardoAssignmentHospitality> | null
): LeonardoAssignmentHospitality {
  const base = emptyAssignmentHospitality();
  if (!hospitality) {
    return base;
  }

  const status = hospitality.status ?? "pending";
  const travels =
    hospitality.travels?.map((segment) => normalizeTravelSegment(segment)) ??
    [];

  const legacyRoom =
    hospitality.roomTypeCode?.trim() ||
    hospitality.roomType?.trim() ||
    "";

  const nightStays = migrateLegacyNightStay(hospitality);

  const normalized: LeonardoAssignmentHospitality = {
    ...base,
    ...hospitality,
    status:
      status in HOSPITALITY_STATUS_LABELS ? status : ("pending" as const),
    hotelBlockId: hospitality.hotelBlockId?.trim() ?? "",
    nightAllotmentId: hospitality.nightAllotmentId?.trim() ?? "",
    roomAllotmentId: hospitality.roomAllotmentId?.trim() ?? "",
    roomTypeCode: legacyRoom,
    checkIn: hospitality.checkIn?.trim() ?? "",
    checkOut: hospitality.checkOut?.trim() ?? "",
    nightStays,
    roommateContactId: hospitality.roommateContactId ?? null,
    roommateFirstName:
      hospitality.roommateFirstName?.trim() ||
      splitLegacyPersonName(
        hospitality.roommateName?.trim() ||
          hospitality.companionName?.trim() ||
          ""
      ).firstName,
    roommateLastName:
      hospitality.roommateLastName?.trim() ||
      splitLegacyPersonName(
        hospitality.roommateName?.trim() ||
          hospitality.companionName?.trim() ||
          ""
      ).lastName,
    roommatePhone: hospitality.roommatePhone?.trim() ?? "",
    roommateEmail: hospitality.roommateEmail?.trim() ?? "",
    roommateRole: hospitality.roommateRole ?? null,
    roommateName: formatCompanionName({
      firstName:
        hospitality.roommateFirstName?.trim() ||
        splitLegacyPersonName(
          hospitality.roommateName?.trim() ||
            hospitality.companionName?.trim() ||
            ""
        ).firstName,
      lastName:
        hospitality.roommateLastName?.trim() ||
        splitLegacyPersonName(
          hospitality.roommateName?.trim() ||
            hospitality.companionName?.trim() ||
            ""
        ).lastName,
    }),
    transferIn: Boolean(hospitality.transferIn),
    transferOut: Boolean(hospitality.transferOut),
    transferInMinutesAfter:
      typeof hospitality.transferInMinutesAfter === "number"
        ? hospitality.transferInMinutesAfter
        : 30,
    transferOutMinutesBefore:
      typeof hospitality.transferOutMinutesBefore === "number"
        ? hospitality.transferOutMinutesBefore
        : 30,
    transferInTime: hospitality.transferInTime?.trim() ?? "",
    transferInTimeManual: Boolean(hospitality.transferInTimeManual),
    transferOutTime: hospitality.transferOutTime?.trim() ?? "",
    transferOutTimeManual: Boolean(hospitality.transferOutTimeManual),
    travels,
  };

  const resolved = resolveTransferTimes(normalized);
  return syncLegacyHospitalityFields({
    ...normalized,
    transferInTime: normalized.transferInTimeManual
      ? normalized.transferInTime
      : resolved.transferInTime,
    transferOutTime: normalized.transferOutTimeManual
      ? normalized.transferOutTime
      : resolved.transferOutTime,
  });
}

export function listHospitalityNightStays(
  hospitality: LeonardoAssignmentHospitality
): LeonardoNightStay[] {
  const normalized = normalizeAssignmentHospitality(hospitality);
  return normalized.nightStays.filter(
    (stay) =>
      stay.hotelBlockId && stay.nightAllotmentId && stay.roomAllotmentId
  );
}

export function roomTypeRequiresRoommate(
  allotment?: Pick<LeonardoRoomAllotment, "code" | "label"> | null
): boolean {
  if (!allotment) {
    return false;
  }
  const key = `${allotment.code} ${allotment.label}`.toLowerCase();
  if (
    key.includes("dus") ||
    key.includes("uso singol") ||
    key.includes("sgl") ||
    key.includes("singol")
  ) {
    return false;
  }
  return (
    key.includes("mat") ||
    key.includes("matrim") ||
    key.includes("dbl") ||
    key.includes("dopp") ||
    key.includes("twin")
  );
}

export function countAllotmentAssignments(
  assignments: Array<{
    id?: string;
    hospitality?: LeonardoAssignmentHospitality | null;
  }>,
  hotelBlockId: string,
  nightAllotmentId: string,
  roomAllotmentId: string,
  onlyConfirmed = false,
  exclude?: { assignmentId: string; stayId?: string }
): number {
  let count = 0;
  for (const assignment of assignments) {
    const hospitality = normalizeAssignmentHospitality(assignment.hospitality);
    if (onlyConfirmed && hospitality.status !== "confirmed") {
      continue;
    }
    for (const stay of listHospitalityNightStays(hospitality)) {
      if (
        exclude &&
        assignment.id === exclude.assignmentId &&
        (!exclude.stayId || stay.id === exclude.stayId)
      ) {
        continue;
      }
      if (
        stay.hotelBlockId === hotelBlockId &&
        stay.nightAllotmentId === nightAllotmentId &&
        stay.roomAllotmentId === roomAllotmentId
      ) {
        count += 1;
      }
    }
  }
  return count;
}

export function summarizeHotelBlocks(
  blocks: LeonardoEventHotelBlock[],
  assignments: Array<{ hospitality?: LeonardoAssignmentHospitality | null }>
): string {
  if (blocks.length === 0) {
    return "Nessun hotel configurato";
  }
  const totalNights = blocks.reduce(
    (sum, block) => sum + block.nightAllotments.length,
    0
  );
  const totalRooms = blocks.reduce(
    (sum, block) =>
      sum +
      block.nightAllotments.reduce(
        (nightSum, night) =>
          nightSum +
          night.roomAllotments.reduce((inner, item) => inner + item.quantity, 0),
        0
      ),
    0
  );
  const assigned = assignments.reduce((sum, item) => {
    const stays = listHospitalityNightStays(
      normalizeAssignmentHospitality(item.hospitality)
    );
    return sum + stays.length;
  }, 0);
  return `${blocks.length} hotel · ${totalNights} notti · ${totalRooms} camere allotment · ${assigned} assegnazioni notti`;
}

export function hospitalityNeedsRoommate(
  hospitalityInput: LeonardoAssignmentHospitality,
  hotelBlocks: LeonardoEventHotelBlock[]
): boolean {
  const hospitality = normalizeAssignmentHospitality(hospitalityInput);
  for (const stay of listHospitalityNightStays(hospitality)) {
    const block = hotelBlocks.find((item) => item.id === stay.hotelBlockId);
    const night = block?.nightAllotments.find(
      (item) => item.id === stay.nightAllotmentId
    );
    const allotment = night?.roomAllotments.find(
      (item) => item.id === stay.roomAllotmentId
    );
    if (roomTypeRequiresRoommate(allotment)) {
      return true;
    }
  }
  return false;
}

export function isHospitalitySheetIncomplete(
  hospitalityInput?: LeonardoAssignmentHospitality | null,
  hotelBlocks: LeonardoEventHotelBlock[] = []
): boolean {
  const hospitality = normalizeAssignmentHospitality(hospitalityInput);
  if (hospitality.status === "pending") {
    return true;
  }

  const hasStay = hospitality.nightStays.some(
    (stay) => stay.hotelBlockId && stay.roomAllotmentId
  );
  if (!hasStay && hospitality.status !== "declined") {
    return true;
  }

  const incompleteTravel = hospitality.travels.some((segment) => {
    if (segment.mode === "car") {
      const field = segment.direction === "outbound" ? "arrivalAt" : "departureAt";
      return !segment[field]?.trim();
    }
    return !segment.departureAt.trim() || !segment.arrivalAt.trim();
  });
  if (incompleteTravel) {
    return true;
  }

  if (hospitality.transferIn && !hospitality.transferInTime.trim()) {
    return true;
  }
  if (hospitality.transferOut && !hospitality.transferOutTime.trim()) {
    return true;
  }

  if (
    hotelBlocks.length > 0
      ? hospitalityNeedsRoommate(hospitality, hotelBlocks) &&
        !hasValidRoommate(hospitality)
      : assignmentNeedsRoommate(hospitality) && !hasValidRoommate(hospitality)
  ) {
    return true;
  }

  return false;
}

export function assignmentNeedsRoommate(
  hospitalityInput?: LeonardoAssignmentHospitality | null
): boolean {
  const hospitality = normalizeAssignmentHospitality(hospitalityInput);
  for (const stay of listHospitalityNightStays(hospitality)) {
    if (
      roomTypeRequiresRoommate({
        code: stay.roomTypeCode,
        label: stay.roomTypeCode,
      })
    ) {
      return true;
    }
  }
  return false;
}

export function hasValidRoommate(
  hospitalityInput?: LeonardoAssignmentHospitality | null
): boolean {
  const hospitality = normalizeAssignmentHospitality(hospitalityInput);
  if (hospitality.roommateContactId) {
    return true;
  }
  return Boolean(
    hospitality.roommateFirstName.trim() && hospitality.roommateLastName.trim()
  );
}

export function formatRoommateSummary(
  hospitalityInput?: LeonardoAssignmentHospitality | null
): string {
  const hospitality = normalizeAssignmentHospitality(hospitalityInput);
  if (hospitality.roommateContactId) {
    const name = formatCompanionName({
      firstName: hospitality.roommateFirstName,
      lastName: hospitality.roommateLastName,
    });
    if (name) {
      return `${name} (partecipante)`;
    }
    return "Partecipante evento";
  }
  const name = formatCompanionName({
    firstName: hospitality.roommateFirstName,
    lastName: hospitality.roommateLastName,
  });
  if (!name) {
    return "";
  }
  if (hospitality.roommateRole === "companion_only") {
    return `${name} (accompagnatore)`;
  }
  return name;
}
