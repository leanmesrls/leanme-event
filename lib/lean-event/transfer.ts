import type {
  LeonardoAssignmentHospitality,
  LeonardoTravelSegment,
} from "@/types/lean-event";

function parseDateTimeValue(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

export function toDatetimeLocalValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/** Arrotonda per eccesso al quarto d'ora precedente (margine extra). Es. 16:48 → 16:45 */
export function floorToQuarterHour(date: Date): Date {
  const result = new Date(date);
  const minutes = result.getMinutes();
  const floored = Math.floor(minutes / 15) * 15;
  result.setMinutes(floored, 0, 0);
  return result;
}

/** Arrotonda per eccesso al quarto d'ora successivo (margine extra). Es. 10:22 → 10:30 */
export function ceilToQuarterHour(date: Date): Date {
  const result = new Date(date);
  const minutes = result.getMinutes();
  const ceiled = Math.ceil(minutes / 15) * 15;
  if (ceiled === 60) {
    result.setHours(result.getHours() + 1, 0, 0, 0);
  } else {
    result.setMinutes(ceiled, 0, 0);
  }
  return result;
}

function segmentReferenceTime(
  segment: LeonardoTravelSegment,
  kind: "arrival" | "departure"
): Date | null {
  if (segment.mode === "car") {
    const field = segment.direction === "outbound" ? "arrivalAt" : "departureAt";
    return parseDateTimeValue(segment[field]);
  }
  if (kind === "arrival") {
    return parseDateTimeValue(segment.arrivalAt);
  }
  return parseDateTimeValue(segment.departureAt);
}

export function findLastOutboundArrival(
  travels: LeonardoTravelSegment[]
): LeonardoTravelSegment | null {
  const outbound = travels.filter((segment) => segment.direction === "outbound");
  if (outbound.length === 0) {
    return null;
  }
  return [...outbound].sort((a, b) => {
    const aTime = segmentReferenceTime(a, "arrival")?.getTime() ?? 0;
    const bTime = segmentReferenceTime(b, "arrival")?.getTime() ?? 0;
    return bTime - aTime;
  })[0];
}

export function findFirstReturnDeparture(
  travels: LeonardoTravelSegment[]
): LeonardoTravelSegment | null {
  const returns = travels.filter((segment) => segment.direction === "return");
  if (returns.length === 0) {
    return null;
  }
  return [...returns].sort((a, b) => {
    const aTime = segmentReferenceTime(a, "departure")?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bTime = segmentReferenceTime(b, "departure")?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  })[0];
}

export function computeTransferInTime(
  travels: LeonardoTravelSegment[],
  minutesAfter: number
): string {
  const segment = findLastOutboundArrival(travels);
  if (!segment || minutesAfter <= 0) {
    return "";
  }
  const arrival = segmentReferenceTime(segment, "arrival");
  if (!arrival) {
    return "";
  }
  const target = new Date(arrival.getTime() + minutesAfter * 60_000);
  return toDatetimeLocalValue(ceilToQuarterHour(target));
}

export function computeTransferOutTime(
  travels: LeonardoTravelSegment[],
  minutesBefore: number
): string {
  const segment = findFirstReturnDeparture(travels);
  if (!segment || minutesBefore <= 0) {
    return "";
  }
  const departure = segmentReferenceTime(segment, "departure");
  if (!departure) {
    return "";
  }
  const target = new Date(departure.getTime() - minutesBefore * 60_000);
  return toDatetimeLocalValue(floorToQuarterHour(target));
}

export function resolveTransferTimes(
  hospitality: Pick<
    LeonardoAssignmentHospitality,
    | "travels"
    | "transferIn"
    | "transferOut"
    | "transferInMinutesAfter"
    | "transferOutMinutesBefore"
    | "transferInTime"
    | "transferOutTime"
    | "transferInTimeManual"
    | "transferOutTimeManual"
  >
): { transferInTime: string; transferOutTime: string } {
  const computedIn =
    hospitality.transferIn && !hospitality.transferInTimeManual
      ? computeTransferInTime(
          hospitality.travels,
          hospitality.transferInMinutesAfter
        )
      : hospitality.transferInTime;

  const computedOut =
    hospitality.transferOut && !hospitality.transferOutTimeManual
      ? computeTransferOutTime(
          hospitality.travels,
          hospitality.transferOutMinutesBefore
        )
      : hospitality.transferOutTime;

  return {
    transferInTime: hospitality.transferIn ? computedIn : "",
    transferOutTime: hospitality.transferOut ? computedOut : "",
  };
}

export function formatTransferTimeLabel(value: string): string {
  const parsed = parseDateTimeValue(value);
  if (!parsed) {
    return value || "—";
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

export interface TransferGroupingSuggestion {
  id: string;
  direction: "in" | "out";
  transferTime: string;
  transferTimeLabel: string;
  mode: string;
  modeLabel: string;
  guestNames: string[];
  guestCount: number;
}

export function buildTransferGroupingSuggestions(
  items: Array<{
    contactName: string;
    transferIn: boolean;
    transferOut: boolean;
    transferInTime: string;
    transferOutTime: string;
    primaryMode: string;
    primaryModeLabel: string;
  }>
): TransferGroupingSuggestion[] {
  const groups = new Map<string, TransferGroupingSuggestion>();

  for (const item of items) {
    if (item.transferIn && item.transferInTime) {
      const key = `in|${item.transferInTime}|${item.primaryMode}`;
      const existing = groups.get(key);
      if (existing) {
        existing.guestNames.push(item.contactName);
        existing.guestCount += 1;
      } else {
        groups.set(key, {
          id: key,
          direction: "in",
          transferTime: item.transferInTime,
          transferTimeLabel: formatTransferTimeLabel(item.transferInTime),
          mode: item.primaryMode,
          modeLabel: item.primaryModeLabel,
          guestNames: [item.contactName],
          guestCount: 1,
        });
      }
    }

    if (item.transferOut && item.transferOutTime) {
      const key = `out|${item.transferOutTime}|${item.primaryMode}`;
      const existing = groups.get(key);
      if (existing) {
        existing.guestNames.push(item.contactName);
        existing.guestCount += 1;
      } else {
        groups.set(key, {
          id: key,
          direction: "out",
          transferTime: item.transferOutTime,
          transferTimeLabel: formatTransferTimeLabel(item.transferOutTime),
          mode: item.primaryMode,
          modeLabel: item.primaryModeLabel,
          guestNames: [item.contactName],
          guestCount: 1,
        });
      }
    }
  }

  return [...groups.values()]
    .filter((group) => group.guestCount >= 2)
    .sort((a, b) => {
      const byTime = a.transferTime.localeCompare(b.transferTime);
      if (byTime !== 0) {
        return byTime;
      }
      return b.guestCount - a.guestCount;
    });
}
