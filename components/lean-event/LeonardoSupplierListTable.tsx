"use client";

import { LeonardoEntityId } from "@/components/lean-event/LeonardoEntityId";
import {
  LEONARDO_LIST_ISSUE_BADGE,
  LEONARDO_LIST_NAME_CELL,
  LEONARDO_LIST_NAME_LINK,
  LEONARDO_LIST_STICKY_HEADER,
} from "@/components/lean-event/leonardo-ui";
import { LeonardoVirtualList } from "@/components/lean-event/LeonardoVirtualList";
import { getSupplierCompletenessIssues } from "@/lib/lean-event/supplier-display";
import { getSupplierCategoryLabel } from "@/lib/lean-event/supplier-categories";
import type { LeanEventSupplier } from "@/types/lean-event";

const VIRTUAL_ROW_HEIGHT = 64;
const VIRTUAL_LIST_HEIGHT = 560;

interface LeonardoSupplierListTableProps {
  suppliers: LeanEventSupplier[];
  activeSupplierId: string | null;
  onOpenSheet: (supplierId: string) => void;
  virtualScroll?: boolean;
}

function SupplierListHeader() {
  return (
    <thead>
      <tr className={LEONARDO_LIST_STICKY_HEADER}>
        <th className="px-3 py-2.5">Fornitore</th>
        <th className="hidden px-3 py-2.5 sm:table-cell">Categoria</th>
        <th className="hidden px-3 py-2.5 md:table-cell">Contatti</th>
        <th className="px-3 py-2.5">Stato</th>
        <th className="px-3 py-2.5 text-right">Scheda</th>
      </tr>
    </thead>
  );
}

function SupplierRow({
  supplier,
  isActive,
  onOpenSheet,
  asTableRow = true,
}: {
  supplier: LeanEventSupplier;
  isActive: boolean;
  onOpenSheet: (supplierId: string) => void;
  asTableRow?: boolean;
}) {
  const rowClass = `border-t border-white/10 transition ${
    isActive ? "bg-leanme-fuchsia/10" : "bg-[#111111] hover:bg-white/[0.03]"
  }`;

  const issues = getSupplierCompletenessIssues(supplier);

  const cells = (
    <>
      <td className={`px-3 py-2.5 ${LEONARDO_LIST_NAME_CELL}`}>
        <button
          type="button"
          title={supplier.name}
          onClick={() => onOpenSheet(supplier.id)}
          className={`${LEONARDO_LIST_NAME_LINK} w-full text-left`}
        >
          {supplier.name}
        </button>
        <LeonardoEntityId id={supplier.id} />
        {supplier.city ? (
          <p className="mt-0.5 truncate text-xs text-white/45">{supplier.city}</p>
        ) : null}
      </td>
      <td className="hidden px-3 py-2.5 text-white/70 sm:table-cell">
        {getSupplierCategoryLabel(supplier.categoryId)}
      </td>
      <td className="hidden px-3 py-2.5 text-white/60 md:table-cell">
        {supplier.contactPerson || supplier.email || "—"}
      </td>
      <td className="px-3 py-2.5">
        {issues.length === 0 ? (
          <span className="text-xs text-emerald-300/80">Completo</span>
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
        <button
          type="button"
          onClick={() => onOpenSheet(supplier.id)}
          className="text-[10px] font-semibold uppercase tracking-[0.08em] text-leanme-fuchsia hover:underline"
        >
          Apri
        </button>
      </td>
    </>
  );

  if (!asTableRow) {
    return (
      <div className={`grid grid-cols-[1fr_auto] items-center gap-2 px-3 py-2.5 ${rowClass}`}>
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

export function LeonardoSupplierListTable({
  suppliers,
  activeSupplierId,
  onOpenSheet,
  virtualScroll = false,
}: LeonardoSupplierListTableProps) {
  if (virtualScroll) {
    return (
      <div className="overflow-hidden rounded-xl border border-white/10">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <SupplierListHeader />
          </table>
        </div>
        <LeonardoVirtualList
          items={suppliers}
          itemHeight={VIRTUAL_ROW_HEIGHT}
          height={VIRTUAL_LIST_HEIGHT}
          className="border-t border-white/10 bg-[#111111]"
          getKey={(item) => item.id}
          renderItem={(supplier) => (
            <SupplierRow
              supplier={supplier}
              isActive={activeSupplierId === supplier.id}
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
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <SupplierListHeader />
          <tbody>
            {suppliers.map((supplier) => (
              <SupplierRow
                key={supplier.id}
                supplier={supplier}
                isActive={activeSupplierId === supplier.id}
                onOpenSheet={onOpenSheet}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
