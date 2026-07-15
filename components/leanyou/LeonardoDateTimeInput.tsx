"use client";

import { useId, useRef, useState } from "react";

import {
  europeanDateTimeToIsoLocal,
  isoLocalToEuropeanDateTime,
  maskEuropeanDateTimeInput,
  normalizeEuropeanDateTimeInput,
} from "@/lib/leanyou/dates";

interface LeonardoDateTimeInputProps {
  /** Valore ISO datetime-local (YYYY-MM-DDTHH:mm) o europeo gg/mm/aaaa hh:mm */
  value: string;
  onChange: (isoLocalValue: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

function toIsoLocalValue(value: string): string {
  if (!value.trim()) {
    return "";
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    return value.slice(0, 16);
  }
  return europeanDateTimeToIsoLocal(value);
}

function toDisplayValue(value: string): string {
  const iso = toIsoLocalValue(value);
  if (!iso) {
    return normalizeEuropeanDateTimeInput(value);
  }
  return normalizeEuropeanDateTimeInput(isoLocalToEuropeanDateTime(iso));
}

export function LeonardoDateTimeInput({
  value,
  onChange,
  placeholder = "gg/mm/aaaa hh:mm",
  className = "w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia",
  disabled = false,
  id: externalId,
}: LeonardoDateTimeInputProps) {
  const generatedId = useId();
  const inputId = externalId ?? generatedId;
  const pickerRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  const isoValue = toIsoLocalValue(value);
  const displayValue = focused ? toDisplayValue(value) : toDisplayValue(value);

  function handleTextChange(raw: string) {
    if (/[/.:\-\sT]/.test(raw) && raw.replace(/\D/g, "").length <= 12) {
      const iso = europeanDateTimeToIsoLocal(raw);
      onChange(iso || raw);
      return;
    }
    const masked = maskEuropeanDateTimeInput(raw);
    const iso = europeanDateTimeToIsoLocal(masked);
    onChange(iso || masked);
  }

  function handleBlur() {
    setFocused(false);
    const normalized = normalizeEuropeanDateTimeInput(toDisplayValue(value));
    if (normalized) {
      onChange(europeanDateTimeToIsoLocal(normalized));
    }
  }

  function openPicker() {
    pickerRef.current?.showPicker?.();
    pickerRef.current?.focus();
  }

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
        onClick={openPicker}
        className="shrink-0 rounded-lg border border-white/15 bg-black px-2.5 py-2.5 text-sm text-white/70 transition hover:border-leanme-fuchsia hover:text-white disabled:opacity-50"
        title="Apri calendario e orario (24 ore)"
        aria-label="Apri calendario e orario"
      >
        📅
      </button>
      <input
        ref={pickerRef}
        type="datetime-local"
        tabIndex={-1}
        aria-hidden
        disabled={disabled}
        value={isoValue}
        onChange={(event) => onChange(event.target.value)}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
      />
    </div>
  );
}
