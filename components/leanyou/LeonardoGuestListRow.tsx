"use client";

import Link from "next/link";

import {
  LEONARDO_LIST_NAME_CELL,
  LEONARDO_LIST_NAME_LINK,
} from "@/components/leanyou/leonardo-ui";
import {
  HOSPITALITY_STATUS_LABELS,
  isHospitalitySheetIncomplete,
  listHospitalityNightStays,
  normalizeAssignmentHospitality,
} from "@/lib/leanyou/hospitality";
import { leanyouLeonardoContactPath } from "@/lib/leanyou/paths";
import type { EventAssignmentWithContact } from "@/lib/leanyou/event-assignments";
import type { LeonardoEventHotelBlock } from "@/types/leanyou";

interface LeonardoGuestListRowProps {
  tenantSlug: string;
  assignment: EventAssignmentWithContact;
  hotelBlocks: LeonardoEventHotelBlock[];
  isActive: boolean;
  onOpenSheet: (assignmentId: string) => void;
  onRemove: (assignmentId: string) => void;
  asTableRow?: boolean;
}

export function LeonardoGuestListRow({
  tenantSlug,
  assignment,
  hotelBlocks,
  isActive,
  onOpenSheet,
  onRemove,
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
          href={leanyouLeonardoContactPath(tenantSlug, assignment.contactId)}
          title={assignment.contactName}
          className={LEONARDO_LIST_NAME_LINK}
          onClick={(event) => event.stopPropagation()}
        >
          {assignment.contactName}
        </Link>
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
            onClick={() => onRemove(assignment.id)}
            className="rounded-full px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/35 transition hover:text-red-300"
          >
            ×
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
