"use client";

import { LeonardoGuestListRow } from "@/components/lean-event/LeonardoGuestListRow";
import { LeonardoVirtualList } from "@/components/lean-event/LeonardoVirtualList";
import type { EventAssignmentWithContact } from "@/lib/lean-event/event-assignments";
import type { LeonardoEventHotelBlock } from "@/types/lean-event";

const VIRTUAL_ROW_HEIGHT = 52;
const VIRTUAL_LIST_HEIGHT = 560;

interface LeonardoGuestListTableProps {
  tenantSlug: string;
  assignments: EventAssignmentWithContact[];
  hotelBlocks: LeonardoEventHotelBlock[];
  activeSheetId: string | null;
  onOpenSheet: (assignmentId: string) => void;
  onRemove: (assignmentId: string) => void;
  virtualScroll?: boolean;
}

function GuestListHeader() {
  return (
    <thead className="bg-[#141414] text-left text-[10px] uppercase tracking-[0.12em] text-white/45">
      <tr>
        <th className="px-3 py-2.5">Ospite</th>
        <th className="hidden px-3 py-2.5 sm:table-cell">Ruolo</th>
        <th className="px-3 py-2.5">Stato</th>
        <th className="hidden px-3 py-2.5 md:table-cell">Hotel</th>
        <th className="hidden px-3 py-2.5 lg:table-cell">Viaggi</th>
        <th className="px-3 py-2.5 text-right">Azioni</th>
      </tr>
    </thead>
  );
}

export function LeonardoGuestListTable({
  tenantSlug,
  assignments,
  hotelBlocks,
  activeSheetId,
  onOpenSheet,
  onRemove,
  virtualScroll = false,
}: LeonardoGuestListTableProps) {
  if (virtualScroll) {
    return (
      <div className="overflow-hidden rounded-xl border border-white/10">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <GuestListHeader />
          </table>
        </div>
        <LeonardoVirtualList
          items={assignments}
          itemHeight={VIRTUAL_ROW_HEIGHT}
          height={VIRTUAL_LIST_HEIGHT}
          className="border-t border-white/10 bg-[#111111]"
          getKey={(item) => item.id}
          renderItem={(assignment) => (
            <LeonardoGuestListRow
              tenantSlug={tenantSlug}
              assignment={assignment}
              hotelBlocks={hotelBlocks}
              isActive={activeSheetId === assignment.id}
              onOpenSheet={onOpenSheet}
              onRemove={onRemove}
              asTableRow={false}
            />
          )}
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <GuestListHeader />
          <tbody>
            {assignments.map((assignment) => (
              <LeonardoGuestListRow
                key={assignment.id}
                tenantSlug={tenantSlug}
                assignment={assignment}
                hotelBlocks={hotelBlocks}
                isActive={activeSheetId === assignment.id}
                onOpenSheet={onOpenSheet}
                onRemove={onRemove}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
