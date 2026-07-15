"use client";

import { useSearchParams } from "next/navigation";

import { LeonardoVenueList } from "@/components/lean-event/LeonardoVenueList";
import type { LeonardoVenue } from "@/types/lean-event";

interface LeonardoVenueListPageClientProps {
  tenantSlug: string;
  initialVenues: LeonardoVenue[];
  clientiEnabled: boolean;
}

export function LeonardoVenueListPageClient({
  tenantSlug,
  initialVenues,
  clientiEnabled,
}: LeonardoVenueListPageClientProps) {
  const searchParams = useSearchParams();
  const initialVenueId = searchParams.get("sede");

  return (
    <LeonardoVenueList
      tenantSlug={tenantSlug}
      initialVenues={initialVenues}
      clientiEnabled={clientiEnabled}
      initialVenueId={initialVenueId}
    />
  );
}
