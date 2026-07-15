"use client";

import {
  LEONARDO_LIST_ISSUE_BADGE,
  LEONARDO_LIST_NAME_CELL,
  LEONARDO_LIST_NAME_LINK,
  LEONARDO_LIST_STICKY_HEADER,
} from "@/components/lean-event/leonardo-ui";
import { LeonardoVirtualList } from "@/components/lean-event/LeonardoVirtualList";
import type { EventSupplierWithSupplier } from "@/lib/lean-event/event-suppliers";
import { getEventSupplierCompletenessIssues } from "@/lib/lean-event/supplier-display";
import { getSupplierCategoryLabel } from "@/lib/lean-event/supplier-categories";

const VIRTUAL_ROW_HEIGHT = 52;
const VIRTUAL_LIST_HEIGHT = 560;

interface LeonardoEventSupplierListTableProps {
  links: EventSupplierWithSupplier[];
  activeLinkId: string | null;
  onOpenSheet: (linkId: string) => void;
  onRemove: (linkId: string) => void;
  virtualScroll?: boolean;
}

function EventSupplierListHeader() {
  return (
    <thead>
      <tr className={LEONARDO_LIST_STICKY_HEADER}>
        <th className="px-3 py-2.5">Fornitore</th>
        <th className="hidden px-3 py-2.5 sm:table-cell">Categoria</th>
        <th className="hidden px-3 py-2.5 md:table-cell">Documenti</th>
        <th className="px-3 py-2.5">Stato</th>
        <th className="px-3 py-2.5 text-right">Azioni</th>
      </tr>
    </thead>
  );
}

function EventSupplierRow({
  link,
  isActive,
  onOpenSheet,
  onRemove,
  asTableRow = true,
}: {
  link: EventSupplierWithSupplier;
  isActive: boolean;
  onOpenSheet: (linkId: string) => void;
  onRemove: (linkId: string) => void;
  asTableRow?: boolean;
}) {
  const name = link.supplier?.name ?? "Fornitore rimosso";
  const issues = getEventSupplierCompletenessIssues(link);
  const rowClass = `border-t border-white/10 transition ${
    isActive ? "bg-leanme-fuchsia/10" : "bg-[#111111] hover:bg-white/[0.03]"
  }`;

  const cells = (
    <>
      <td className={`px-3 py-2.5 ${LEONARDO_LIST_NAME_CELL}`}>
        <button
          type="button"
          title={name}
          onClick={() => onOpenSheet(link.id)}
          className={`${LEONARDO_LIST_NAME_LINK} w-full text-left`}
        >
          {name}
        </button>
        {link.roleNotes ? (
          <p className="mt-0.5 truncate text-xs text-white/45">{link.roleNotes}</p>
        ) : null}
      </td>
      <td className="hidden px-3 py-2.5 text-white/70 sm:table-cell">
        {getSupplierCategoryLabel(link.categoryId)}
      </td>
      <td className="hidden px-3 py-2.5 text-white/60 md:table-cell">
        {link.documents?.length ?? 0}
      </td>
      <td className="px-3 py-2.5">
        {issues.length === 0 ? (
          <span className="text-xs text-emerald-300/80">OK</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {issues.map((issue) => (
              <span key={issue} className={LEONARDO_LIST_ISSUE_BADGE} title={issue}>
                {issue}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="px-3 py-2.5 text-right">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenSheet(link.id)}
            className="text-[10px] font-semibold uppercase tracking-[0.08em] text-leanme-fuchsia hover:underline"
          >
            Scheda
          </button>
          <button
            type="button"
            onClick={() => onRemove(link.id)}
            className="text-[10px] font-semibold uppercase tracking-[0.08em] text-red-300/80 hover:text-red-200"
          >
            Rimuovi
          </button>
        </div>
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

export function LeonardoEventSupplierListTable({
  links,
  activeLinkId,
  onOpenSheet,
  onRemove,
  virtualScroll = false,
}: LeonardoEventSupplierListTableProps) {
  if (virtualScroll) {
    return (
      <div className="overflow-hidden rounded-xl border border-white/10">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <EventSupplierListHeader />
          </table>
        </div>
        <LeonardoVirtualList
          items={links}
          itemHeight={VIRTUAL_ROW_HEIGHT}
          height={VIRTUAL_LIST_HEIGHT}
          className="border-t border-white/10 bg-[#111111]"
          getKey={(item) => item.id}
          renderItem={(link) => (
            <EventSupplierRow
              link={link}
              isActive={activeLinkId === link.id}
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
    <div className="max-h-[560px] overflow-auto rounded-xl border border-white/10">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <EventSupplierListHeader />
          <tbody>
            {links.map((link) => (
              <EventSupplierRow
                key={link.id}
                link={link}
                isActive={activeLinkId === link.id}
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
