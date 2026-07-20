"use client";

import { LeonardoEntityId } from "@/components/lean-event/LeonardoEntityId";
import {
  LEONARDO_LIST_NAME_CELL,
  LEONARDO_LIST_NAME_LINK,
  LEONARDO_LIST_STICKY_HEADER,
} from "@/components/lean-event/leonardo-ui";
import { LeonardoVirtualList } from "@/components/lean-event/LeonardoVirtualList";
import { resolveVenueCoverSrc } from "@/lib/lean-event/venue-display";
import {
  formatInternalRatingLabel,
  formatStarCategoryLabel,
} from "@/lib/lean-event/venue-normalize";
import type { LeonardoVenue } from "@/types/lean-event";

const VIRTUAL_ROW_HEIGHT = 68;
const VIRTUAL_LIST_HEIGHT = 560;

interface LeonardoVenueListTableProps {
  venues: LeonardoVenue[];
  activeVenueId: string | null;
  onOpenSheet: (venueId: string) => void;
  virtualScroll?: boolean;
}

function VenueListHeader() {
  return (
    <thead>
      <tr className={LEONARDO_LIST_STICKY_HEADER}>
        <th className="w-16 px-3 py-2.5">Foto</th>
        <th className="px-3 py-2.5">Nome sede</th>
        <th className="hidden px-3 py-2.5 sm:table-cell">Città</th>
        <th className="hidden px-3 py-2.5 lg:table-cell">Stelle</th>
        <th className="hidden px-3 py-2.5 xl:table-cell">Int.</th>
        <th className="px-3 py-2.5 text-right">Scheda</th>
      </tr>
    </thead>
  );
}

function VenueRow({
  venue,
  isActive,
  onOpenSheet,
  asTableRow = true,
}: {
  venue: LeonardoVenue;
  isActive: boolean;
  onOpenSheet: (venueId: string) => void;
  asTableRow?: boolean;
}) {
  const coverSrc = resolveVenueCoverSrc(venue);
  const rowClass = `border-t border-white/10 transition ${
    isActive ? "bg-leanme-fuchsia/10" : "bg-[#111111] hover:bg-white/[0.03]"
  }`;

  const cells = (
    <>
      <td className="px-3 py-2.5">
        {coverSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverSrc}
            alt=""
            loading="lazy"
            className="h-10 w-14 rounded object-cover"
          />
        ) : (
          <span className="inline-flex h-10 w-14 items-center justify-center rounded bg-white/5 text-[10px] text-white/30">
            —
          </span>
        )}
      </td>
      <td className={`px-3 py-2.5 ${LEONARDO_LIST_NAME_CELL}`}>
        <button
          type="button"
          title={venue.name}
          onClick={() => onOpenSheet(venue.id)}
          className={`${LEONARDO_LIST_NAME_LINK} w-full text-left`}
        >
          {venue.name}
        </button>
        <LeonardoEntityId id={venue.id} />
        <p className="mt-0.5 truncate text-xs text-white/45 sm:hidden">
          {venue.city}
        </p>
      </td>
      <td className="hidden px-3 py-2.5 text-white/70 sm:table-cell">{venue.city}</td>
      <td className="hidden px-3 py-2.5 text-white/70 lg:table-cell">
        {formatStarCategoryLabel(venue.starCategory)}
      </td>
      <td className="hidden px-3 py-2.5 text-amber-200/90 xl:table-cell">
        {formatInternalRatingLabel(venue.internalRating)}
      </td>
      <td className="px-3 py-2.5 text-right">
        <button
          type="button"
          onClick={() => onOpenSheet(venue.id)}
          className="text-[10px] font-semibold uppercase tracking-[0.08em] text-leanme-fuchsia hover:underline"
        >
          Apri
        </button>
      </td>
    </>
  );

  if (!asTableRow) {
    return (
      <div className={`px-3 py-2.5 ${rowClass}`}>
        <table className="w-full text-sm">
          <tbody>
            <tr>{cells}</tr>
          </tbody>
        </table>
      </div>
    );
  }

  return <tr className={rowClass}>{cells}</tr>;
}

export function LeonardoVenueListTable({
  venues,
  activeVenueId,
  onOpenSheet,
  virtualScroll = false,
}: LeonardoVenueListTableProps) {
  if (virtualScroll) {
    return (
      <div className="overflow-hidden rounded-xl border border-white/10">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <VenueListHeader />
          </table>
        </div>
        <LeonardoVirtualList
          items={venues}
          itemHeight={VIRTUAL_ROW_HEIGHT}
          height={VIRTUAL_LIST_HEIGHT}
          className="border-t border-white/10 bg-[#111111]"
          getKey={(item) => item.id}
          renderItem={(venue) => (
            <VenueRow
              venue={venue}
              isActive={activeVenueId === venue.id}
              onOpenSheet={onOpenSheet}
              asTableRow={false}
            />
          )}
        />
      </div>
    );
  }

  return (
    <div className="max-h-[560px] overflow-auto rounded-xl border border-white/10">
      <table className="min-w-full text-sm">
        <VenueListHeader />
        <tbody>
          {venues.map((venue) => (
            <VenueRow
              key={venue.id}
              venue={venue}
              isActive={activeVenueId === venue.id}
              onOpenSheet={onOpenSheet}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
