"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

interface LeonardoCreatableSelectProps {
  id?: string;
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
}

/**
 * Select con opzioni predefinite + possibilità di inserire un valore custom.
 */
export function LeonardoCreatableSelect({
  id,
  label,
  value,
  options,
  onChange,
  placeholder = "Seleziona o digita…",
  className,
  allowEmpty = true,
  emptyLabel = "—",
}: LeonardoCreatableSelectProps) {
  const [customMode, setCustomMode] = useState(() => {
    if (!value.trim()) {
      return false;
    }
    return !options.some(
      (option) => option.toLowerCase() === value.trim().toLowerCase()
    );
  });

  const mergedOptions = useMemo(() => {
    const set = new Set(options.map((option) => option));
    if (value.trim() && !customMode) {
      const match = options.find(
        (option) => option.toLowerCase() === value.trim().toLowerCase()
      );
      if (!match) {
        set.add(value.trim());
      }
    }
    return Array.from(set);
  }, [options, value, customMode]);

  const selectValue = customMode
    ? "__custom__"
    : mergedOptions.find(
        (option) => option.toLowerCase() === value.trim().toLowerCase()
      ) ?? "";

  return (
    <label className={cn("block text-sm", className)}>
      <span className="mb-1 block text-white/60">{label}</span>
      <select
        id={id}
        value={selectValue}
        onChange={(event) => {
          const next = event.target.value;
          if (next === "__custom__") {
            setCustomMode(true);
            if (
              options.some(
                (option) => option.toLowerCase() === value.trim().toLowerCase()
              )
            ) {
              onChange("");
            }
            return;
          }
          setCustomMode(false);
          onChange(next);
        }}
        className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
      >
        {allowEmpty ? <option value="">{emptyLabel}</option> : null}
        {mergedOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        <option value="__custom__">Altro (digita…)</option>
      </select>
      {customMode ? (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="mt-2 w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
        />
      ) : null}
    </label>
  );
}
