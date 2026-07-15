"use client";

import type { ListSortMode } from "@/lib/leanyou/list-sort";
import { LIST_SORT_OPTIONS, LIST_SORT_OPTIONS_NO_EVENT_DATE } from "@/lib/leanyou/list-sort";

interface LeonardoListSortSelectProps {
  value: ListSortMode | Exclude<ListSortMode, "date_start">;
  onChange: (value: ListSortMode | Exclude<ListSortMode, "date_start">) => void;
  includeEventDate?: boolean;
  className?: string;
}

export function LeonardoListSortSelect({
  value,
  onChange,
  includeEventDate = false,
  className = "mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia",
}: LeonardoListSortSelectProps) {
  const options = includeEventDate
    ? LIST_SORT_OPTIONS
    : LIST_SORT_OPTIONS_NO_EVENT_DATE;

  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
        Ordina per
      </span>
      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value as ListSortMode | Exclude<ListSortMode, "date_start">
          )
        }
        className={className}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
