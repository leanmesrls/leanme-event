import type { LeonardoVenue } from "@/types/lean-event";

import { buildVenueSnapshot } from "./venue-display";
import { getVenue } from "./venues";

export async function resolveEventVenueFields(
  tenantId: string,
  input: {
    venueId?: string | null;
    venue?: string;
  }
): Promise<{ venueId: string | null; venue: string }> {
  const venueId = input.venueId?.trim() || null;

  if (venueId) {
    const linked = await getVenue(tenantId, venueId);
    if (linked) {
      return {
        venueId,
        venue: buildVenueSnapshot(linked),
      };
    }
    return {
      venueId: null,
      venue: input.venue?.trim() ?? "",
    };
  }

  return {
    venueId: null,
    venue: input.venue?.trim() ?? "",
  };
}

export function eventVenueDisplayLabel(
  venueSnapshot: string,
  linkedVenue?: LeonardoVenue | null
): string {
  if (linkedVenue) {
    return buildVenueSnapshot(linkedVenue);
  }
  return venueSnapshot.trim() || "—";
}
