import { normalizeAssignmentHospitality } from "@/lib/lean-event/hospitality";
import {
  syncLegacyHospitalityFields,
} from "@/lib/lean-event/night-stays";
import type {
  LeonardoAssignmentHospitality,
  TenantEventHotelBlock,
  LeonardoNightStay,
} from "@/types/lean-event";

function isStayRoomAllotmentValid(
  stay: LeonardoNightStay,
  hotelBlocks: TenantEventHotelBlock[]
): boolean {
  if (!stay.roomAllotmentId.trim()) {
    return true;
  }

  const block = hotelBlocks.find((item) => item.id === stay.hotelBlockId);
  const night = block?.nightAllotments.find(
    (item) =>
      item.id === stay.nightAllotmentId ||
      item.nightDate.trim() === stay.nightDate.trim()
  );
  return Boolean(
    night?.roomAllotments.some((item) => item.id === stay.roomAllotmentId)
  );
}

export function reconcileHospitalityWithHotelBlocks(
  hospitalityInput: LeonardoAssignmentHospitality | null | undefined,
  hotelBlocks: TenantEventHotelBlock[]
): LeonardoAssignmentHospitality {
  const hospitality = normalizeAssignmentHospitality(hospitalityInput);
  const nightStays = hospitality.nightStays.map((stay) => {
    if (isStayRoomAllotmentValid(stay, hotelBlocks)) {
      return stay;
    }
    return {
      ...stay,
      roomAllotmentId: "",
      roomTypeCode: "",
    };
  });

  return syncLegacyHospitalityFields(
    normalizeAssignmentHospitality({
      ...hospitality,
      nightStays,
    })
  );
}

export function hospitalityRoomAllotmentsChanged(
  before: LeonardoAssignmentHospitality | null | undefined,
  after: LeonardoAssignmentHospitality
): boolean {
  const previous = normalizeAssignmentHospitality(before);
  const next = normalizeAssignmentHospitality(after);
  return JSON.stringify(previous.nightStays) !== JSON.stringify(next.nightStays);
}
