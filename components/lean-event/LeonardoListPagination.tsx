"use client";

import {
  LEONARDO_DEFAULT_PAGE_SIZE,
  LEONARDO_PAGE_SIZE_OPTIONS,
  type LeonardoPageSize,
} from "@/lib/lean-event/list-pagination";

interface LeonardoListPaginationProps {
  totalItems: number;
  page: number;
  totalPages: number;
  pageSize: LeonardoPageSize;
  pageItemsCount: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: LeonardoPageSize) => void;
  showVirtualOption?: boolean;
}

export function LeonardoListPagination({
  totalItems,
  page,
  totalPages,
  pageSize,
  pageItemsCount,
  itemLabel = "elementi",
  onPageChange,
  onPageSizeChange,
  showVirtualOption = true,
}: LeonardoListPaginationProps) {
  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/45">
        {totalItems} {itemLabel}
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="block text-xs text-white/45">
          <span className="mb-1 block uppercase tracking-[0.1em]">Righe per pagina</span>
          <select
            value={pageSize}
            onChange={(event) => {
              const value = event.target.value;
              onPageSizeChange(
                value === "virtual"
                  ? "virtual"
                  : (Number(value) as LeonardoPageSize)
              );
            }}
            className="rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
          >
            {LEONARDO_PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
            {showVirtualOption ? (
              <option value="virtual">Scroll virtual ({totalItems})</option>
            ) : null}
          </select>
        </label>
      </div>

      {pageSize !== "virtual" && totalPages > 1 ? (
        <div className="flex w-full flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
          <p className="text-xs text-white/45">
            Pagina {page} di {totalPages} · {pageItemsCount} {itemLabel}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="rounded-full border border-white/20 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/70 transition hover:border-leanme-fuchsia hover:text-white disabled:opacity-40"
            >
              ← Precedente
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="rounded-full border border-white/20 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/70 transition hover:border-leanme-fuchsia hover:text-white disabled:opacity-40"
            >
              Successiva →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { LEONARDO_DEFAULT_PAGE_SIZE };
