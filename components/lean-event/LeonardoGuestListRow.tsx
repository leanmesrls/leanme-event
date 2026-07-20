"use client";

import Link from "next/link";

import { LeonardoEntityId } from "@/components/lean-event/LeonardoEntityId";
import {
  LEONARDO_LIST_NAME_CELL,
  LEONARDO_LIST_NAME_LINK,
} from "@/components/lean-event/leonardo-ui";
import {
  HOSPITALITY_STATUS_LABELS,
  isHospitalitySheetIncomplete,
  listHospitalityNightStays,
  normalizeAssignmentHospitality,
} from "@/lib/lean-event/hospitality";
import { leanEventLeonardoContactPath } from "@/lib/lean-event/paths";
import type { EventAssignmentWithContact } from "@/lib/lean-event/event-assignments";
import type { LeonardoEventHotelBlock } from "@/types/lean-event";

interface LeonardoGuestListRowProps {
  tenantSlug: string;
  assignment: EventAssignmentWithContact;
  hotelBlocks: LeonardoEventHotelBlock[];
  isActive: boolean;
  onOpenSheet: (assignmentId: string) => void;
  onRemove: (assignmentId: string) => void;
  removing?: boolean;
  asTableRow?: boolean;
}

export function LeonardoGuestListRow({
  tenantSlug,
  assignment,
  hotelBlocks,
  isActive,
  onOpenSheet,
  onRemove,
  removing = false,
  asTableRow = true,
}: LeonardoGuestListRowProps) {
  const hospitality = normalizeAssignmentHospitality(assignment.hospitality);
  const incomplete = isHospitalitySheetIncomplete(
    assignment.hospitality,
    hotelBlocks
  );
  const nightCount = listHospitalityNightStays(hospitality).length;
  const travelCount = hospitality.travels.length;

  const rowClass = `border-t border-white/10 transition ${
    isActive ? "bg-leanme-fuchsia/10" : "bg-[#111111] hover:bg-white/[0.03]"
  }`;

  const cells = (
    <>
      <td className={`px-3 py-2.5 ${LEONARDO_LIST_NAME_CELL}`}>
        <Link
          href={leanEventLeonardoContactPath(tenantSlug, assignment.contactId)}
          title={assignment.contactName}
          className={LEONARDO_LIST_NAME_LINK}
          onClick={(event) => event.stopPropagation()}
        >
          {assignment.contactName}
        </Link>
        <LeonardoEntityId id={assignment.contactId} />
        <p className="truncate text-xs text-white/45 sm:hidden">
          {assignment.roleLabel}
        </p>
      </td>
      <td className="hidden px-3 py-2.5 text-white/65 sm:table-cell">
        {assignment.roleLabel}
      </td>
      <td className="px-3 py-2.5">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${
            incomplete
              ? "bg-amber-500/15 text-amber-100"
              : hospitality.status === "confirmed"
                ? "bg-emerald-500/15 text-emerald-100"
                : "bg-white/10 text-white/60"
          }`}
        >
          {incomplete ? "Da compilare" : HOSPITALITY_STATUS_LABELS[hospitality.status]}
        </span>
      </td>
      <td className="hidden px-3 py-2.5 text-xs text-white/50 md:table-cell">
        {nightCount > 0 ? `${nightCount} notti` : "—"}
      </td>
      <td className="hidden px-3 py-2.5 text-xs text-white/50 lg:table-cell">
        {travelCount > 0 ? `${travelCount} tratte` : "—"}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onOpenSheet(assignment.id)}
            className={`rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition ${
              incomplete
                ? "bg-leanme-fuchsia text-white hover:bg-leanme-fuchsia-dark"
                : "border border-white/20 text-white/70 hover:border-leanme-fuchsia hover:text-white"
            }`}
          >
            {incomplete ? "Compila" : "Apri"}
          </button>
          <button
            type="button"
            disabled={removing}
            onClick={(event) => {
              event.stopPropagation();
              onRemove(assignment.id);
            }}
            aria-label={`Rimuovi ${assignment.contactName} dall'evento`}
            className="rounded-full border border-white/10 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/45 transition hover:border-red-400/40 hover:text-red-300 disabled:opacity-40"
          >
            {removing ? "…" : "Rimuovi"}
          </button>
        </div>
      </td>
    </>
  );

  if (!asTableRow) {
    return (
      <div className={`flex h-full items-center ${rowClass}`}>
        <table className="min-w-full text-sm">
          <tbody>
            <tr className={rowClass}>{cells}</tr>
          </tbody>
        </table>
      </div>
    );
  }

  return <tr className={rowClass}>{cells}</tr>;
}
