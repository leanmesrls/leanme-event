import { generateNightDatesFromPeriod } from "@/lib/lean-event/allotment-report";
import type {
  LeonardoAssignmentHospitality,
  LeonardoEventHotelBlock,
  LeonardoNightStay,
} from "@/types/lean-event";

function uid(): string {
  return crypto.randomUUID();
}

export function emptyNightStay(
  partial?: Partial<LeonardoNightStay>
): LeonardoNightStay {
  return {
    id: partial?.id ?? uid(),
    nightDate: partial?.nightDate?.trim() ?? "",
    hotelBlockId: partial?.hotelBlockId?.trim() ?? "",
    nightAllotmentId: partial?.nightAllotmentId?.trim() ?? "",
    roomAllotmentId: partial?.roomAllotmentId?.trim() ?? "",
    roomTypeCode: partial?.roomTypeCode?.trim() ?? "",
  };
}

export function migrateLegacyNightStay(
  hospitality: Partial<LeonardoAssignmentHospitality>
): LeonardoNightStay[] {
  if (hospitality.nightStays?.length) {
    return hospitality.nightStays.map((stay) => emptyNightStay(stay));
  }

  if (
    hospitality.hotelBlockId?.trim() &&
    hospitality.nightAllotmentId?.trim() &&
    hospitality.roomAllotmentId?.trim()
  ) {
    return [
      emptyNightStay({
        hotelBlockId: hospitality.hotelBlockId,
        nightAllotmentId: hospitality.nightAllotmentId,
        roomAllotmentId: hospitality.roomAllotmentId,
        roomTypeCode: hospitality.roomTypeCode,
      }),
    ];
  }

  return [];
}

export function syncLegacyHospitalityFields(
  hospitality: LeonardoAssignmentHospitality
): LeonardoAssignmentHospitality {
  const first = hospitality.nightStays[0];
  return {
    ...hospitality,
    hotelBlockId: first?.hotelBlockId ?? "",
    nightAllotmentId: first?.nightAllotmentId ?? "",
    roomAllotmentId: first?.roomAllotmentId ?? "",
    roomTypeCode: first?.roomTypeCode ?? hospitality.roomTypeCode,
  };
}

export function listGuestNightDates(
  checkIn: string,
  checkOut: string,
  hotelBlocks: LeonardoEventHotelBlock[]
): string[] {
  const fromPeriod = generateNightDatesFromPeriod(checkIn, checkOut);
  if (fromPeriod.length > 0) {
    return fromPeriod;
  }

  const dates = new Set<string>();
  for (const block of hotelBlocks) {
    for (const night of block.nightAllotments) {
      if (night.nightDate.trim()) {
        dates.add(night.nightDate.trim());
      }
    }
  }
  return [...dates].sort((a, b) => a.localeCompare(b, "it"));
}

export function prefillNightStaysFromFirst(
  currentStays: LeonardoNightStay[],
  nightDates: string[],
  template: Pick<
    LeonardoNightStay,
    "hotelBlockId" | "nightAllotmentId" | "roomAllotmentId" | "roomTypeCode"
  >,
  hotelBlocks: LeonardoEventHotelBlock[] = []
): LeonardoNightStay[] {
  if (!template.hotelBlockId || !template.roomAllotmentId) {
    return currentStays;
  }

  const block = hotelBlocks.find((item) => item.id === template.hotelBlockId);
  const byDate = new Map(
    currentStays.map((stay) => [stay.nightDate.trim(), stay])
  );

  return nightDates.map((nightDate) => {
    const existing = byDate.get(nightDate);
    if (existing?.roomAllotmentId) {
      return existing;
    }
    if (existing) {
      return {
        ...existing,
        hotelBlockId: template.hotelBlockId,
        nightAllotmentId: resolveNightAllotmentId(block, nightDate),
        roomAllotmentId: template.roomAllotmentId,
        roomTypeCode: template.roomTypeCode,
      };
    }
    return emptyNightStay({
      nightDate,
      hotelBlockId: template.hotelBlockId,
      nightAllotmentId: resolveNightAllotmentId(block, nightDate),
      roomAllotmentId: template.roomAllotmentId,
      roomTypeCode: template.roomTypeCode,
    });
  });
}

export function buildNightStaysForGuestPeriod(
  checkIn: string,
  checkOut: string,
  hotelBlocks: LeonardoEventHotelBlock[],
  currentStays: LeonardoNightStay[] = []
): LeonardoNightStay[] {
  const dates = listGuestNightDates(checkIn, checkOut, hotelBlocks);
  if (dates.length === 0) {
    return currentStays;
  }

  const template = currentStays.find(
    (stay) => stay.hotelBlockId && stay.roomAllotmentId
  );

  if (template) {
    return prefillNightStaysFromFirst(
      currentStays,
      dates,
      template,
      hotelBlocks
    );
  }

  const byDate = new Map(
    currentStays.map((stay) => [stay.nightDate.trim(), stay])
  );

  return dates.map(
    (nightDate) => byDate.get(nightDate) ?? emptyNightStay({ nightDate })
  );
}

export function resolveNightAllotmentId(
  block: LeonardoEventHotelBlock | undefined,
  nightDate: string
): string {
  if (!block) {
    return "";
  }
  const match = block.nightAllotments.find(
    (night) => night.nightDate.trim() === nightDate.trim()
  );
  return match?.id ?? "";
}
