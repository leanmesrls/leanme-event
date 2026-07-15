"use client";

import { useId, useRef, useState } from "react";

import {
  europeanDateToIsoDate,
  isoDateToEuropeanDate,
  maskEuropeanDateInput,
  normalizeEuropeanDateInput,
} from "@/lib/lean-event/dates";

interface LeonardoDateInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export function LeonardoDateInput({
  value,
  onChange,
  placeholder = "gg/mm/aaaa",
  className = "w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia",
  disabled = false,
  id: externalId,
}: LeonardoDateInputProps) {
  const generatedId = useId();
  const inputId = externalId ?? generatedId;
  const calendarRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  const displayValue = focused ? value : normalizeEuropeanDateInput(value);

  function handleTextChange(raw: string) {
    if (/[/.-]/.test(raw) && raw.replace(/\D/g, "").length <= 8) {
      onChange(raw);
      return;
    }
    onChange(maskEuropeanDateInput(raw));
  }

  function handleBlur() {
    setFocused(false);
    const normalized = normalizeEuropeanDateInput(value);
    if (normalized !== value) {
      onChange(normalized);
    }
  }

  function openCalendar() {
    calendarRef.current?.showPicker?.();
    calendarRef.current?.focus();
  }

  const isoValue = europeanDateToIsoDate(value);

  return (
    <div className="relative flex items-center gap-1">
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        value={displayValue}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        onChange={(event) => handleTextChange(event.target.value)}
        className={className}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={openCalendar}
        className="shrink-0 rounded-lg border border-white/15 bg-black px-2.5 py-2.5 text-sm text-white/70 transition hover:border-leanme-fuchsia hover:text-white disabled:opacity-50"
        title="Apri calendario"
        aria-label="Apri calendario"
      >
        📅
      </button>
      <input
        ref={calendarRef}
        type="date"
        tabIndex={-1}
        aria-hidden
        disabled={disabled}
        value={isoValue}
        onChange={(event) => {
          const next = isoDateToEuropeanDate(event.target.value);
          onChange(next);
        }}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
      />
    </div>
  );
}
