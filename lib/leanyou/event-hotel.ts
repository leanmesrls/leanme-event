import type {
  LeonardoEvent,
  LeonardoEventHotelBlock,
  LeonardoEventHotelConfig,
  LeonardoNightAllotment,
  LeonardoRoomAllotment,
} from "@/types/leanyou";

import { DEFAULT_ROOM_ALLOTMENT_PRESETS } from "./hospitality";

function newEntityId(existing?: string): string {
  if (existing?.trim()) {
    return existing.trim();
  }
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyRoomAllotment(
  partial?: Partial<LeonardoRoomAllotment>
): LeonardoRoomAllotment {
  return {
    id: newEntityId(partial?.id),
    code: partial?.code?.trim().toUpperCase() ?? "",
    label: partial?.label?.trim() ?? "",
    quantity: Math.max(0, partial?.quantity ?? 0),
  };
}

export function defaultRoomAllotmentsForNight(): LeonardoRoomAllotment[] {
  return DEFAULT_ROOM_ALLOTMENT_PRESETS.map((preset) =>
    emptyRoomAllotment({
      code: preset.code,
      label: preset.label,
      quantity: 0,
    })
  );
}

export function emptyNightAllotment(
  partial?: Partial<LeonardoNightAllotment>
): LeonardoNightAllotment {
  return {
    id: newEntityId(partial?.id),
    nightDate: partial?.nightDate?.trim() ?? "",
    roomAllotments:
      partial?.roomAllotments?.map((item) => emptyRoomAllotment(item)) ??
      defaultRoomAllotmentsForNight(),
  };
}

function migrateBlockRoomAllotmentsToNights(
  block: Partial<LeonardoEventHotelBlock>
): LeonardoNightAllotment[] {
  if (block.nightAllotments?.length) {
    return block.nightAllotments.map((night) => emptyNightAllotment(night));
  }

  if (block.roomAllotments?.length) {
    const hasQty = block.roomAllotments.some((item) => item.quantity > 0);
    if (hasQty || block.roomAllotments.some((item) => item.code || item.label)) {
      return [
        emptyNightAllotment({
          nightDate: block.checkInDate ?? "",
          roomAllotments: block.roomAllotments,
        }),
      ];
    }
  }

  return [];
}

export function emptyHotelBlock(
  partial?: Partial<LeonardoEventHotelBlock>
): LeonardoEventHotelBlock {
  return {
    id: newEntityId(partial?.id),
    venueId: partial?.venueId?.trim() ?? "",
    checkInDate: partial?.checkInDate?.trim() ?? "",
    checkOutDate: partial?.checkOutDate?.trim() ?? "",
    nightAllotments: migrateBlockRoomAllotmentsToNights(partial ?? {}),
    notes: partial?.notes?.trim() ?? "",
  };
}

function migrateLegacyHotelConfig(
  hotel?: LeonardoEventHotelConfig | null
): LeonardoEventHotelBlock[] {
  if (!hotel?.hotelVenueId) {
    return [];
  }

  const allotments: LeonardoRoomAllotment[] = [];
  if (hotel.allotmentRooms > 0) {
    allotments.push(
      emptyRoomAllotment({
        code: "GEN",
        label: "Camere generiche",
        quantity: hotel.allotmentRooms,
      })
    );
  }

  return [
    emptyHotelBlock({
      venueId: hotel.hotelVenueId,
      checkInDate: hotel.checkInDate,
      checkOutDate: hotel.checkOutDate,
      nightAllotments: allotments.length
        ? [
            emptyNightAllotment({
              nightDate: hotel.checkInDate,
              roomAllotments: allotments,
            }),
          ]
        : [],
      notes: hotel.notes,
    }),
  ];
}

export function normalizeHotelBlocks(
  event: Pick<LeonardoEvent, "hotelBlocks" | "hotel">
): LeonardoEventHotelBlock[] {
  if (event.hotelBlocks?.length) {
    return event.hotelBlocks.map((block) => emptyHotelBlock(block));
  }
  return migrateLegacyHotelConfig(event.hotel);
}

export function findHotelBlock(
  blocks: LeonardoEventHotelBlock[],
  blockId: string
): LeonardoEventHotelBlock | undefined {
  return blocks.find((block) => block.id === blockId);
}

export function findNightAllotment(
  block: LeonardoEventHotelBlock | undefined,
  nightId: string
): LeonardoNightAllotment | undefined {
  return block?.nightAllotments.find((night) => night.id === nightId);
}

export function findRoomAllotment(
  night: LeonardoNightAllotment | undefined,
  allotmentId: string
): LeonardoRoomAllotment | undefined {
  return night?.roomAllotments.find((item) => item.id === allotmentId);
}

export function formatAllotmentLabel(allotment: LeonardoRoomAllotment): string {
  const code = allotment.code.trim();
  const label = allotment.label.trim();
  if (code && label) {
    return `${code} — ${label}`;
  }
  return code || label || "Tipologia";
}

export function formatNightLabel(night: LeonardoNightAllotment): string {
  return night.nightDate.trim() || "Notte senza data";
}
