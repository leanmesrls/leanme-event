const EU_DATE_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const EU_DATE_LOOSE_REGEX = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/;

/** Maschera digitazione gg/mm/aaaa mentre si digita. */
export function maskEuropeanDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function parseItalianDate(value: string): Date | null {
  const match = value.trim().match(EU_DATE_LOOSE_REGEX);
  if (!match) {
    return null;
  }
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function formatItalianDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

export function normalizeEuropeanDateInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (EU_DATE_REGEX.test(trimmed)) {
    return trimmed;
  }
  const parsed = parseItalianDate(trimmed);
  if (parsed) {
    return formatItalianDate(parsed);
  }
  return maskEuropeanDateInput(trimmed);
}

export function europeanDateToIsoDate(value: string): string {
  const normalized = normalizeEuropeanDateInput(value);
  return parseEuropeanDateToIso(normalized) ?? "";
}

export function isoDateToEuropeanDate(value: string): string {
  if (!value?.trim()) {
    return "";
  }
  return formatEuropeanDate(value);
}

export function formatEuropeanDate(value: string | null | undefined): string {
  if (!value?.trim()) {
    return "-";
  }

  const trimmed = value.trim();
  if (EU_DATE_REGEX.test(trimmed)) {
    return trimmed;
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}/${month}/${year}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${parsed.getFullYear()}`;
}

export function parseEuropeanDateToIso(value: string): string | null {
  const trimmed = value.trim();
  const european = trimmed.match(EU_DATE_REGEX);
  if (european) {
    const [, day, month, year] = european;
    return `${year}-${month}-${day}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function todayEuropeanDate(): string {
  return formatEuropeanDate(new Date().toISOString().slice(0, 10));
}

export function parseAnyDateValue(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const italian = parseItalianDate(trimmed);
  if (italian) {
    return italian;
  }

  const iso = parseEuropeanDateToIso(trimmed);
  if (iso) {
    const [year, month, day] = iso.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

export function validateEventDateRange(
  startDate: string,
  endDate: string
): { ok: true } | { ok: false; message: string } {
  const start = parseAnyDateValue(startDate);
  const end = parseAnyDateValue(endDate);

  if (!start || !end) {
    return { ok: true };
  }

  if (end < start) {
    return {
      ok: false,
      message:
        "La data fine evento deve essere uguale o successiva alla data di inizio.",
    };
  }

  return { ok: true };
}

const EU_DATETIME_REGEX =
  /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/;

/** Maschera digitazione gg/mm/aaaa hh:mm (24 ore). */
export function maskEuropeanDateTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 12);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }
  if (digits.length <= 10) {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)} ${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)} ${digits.slice(8, 10)}:${digits.slice(10)}`;
}

export function normalizeEuropeanDateTimeInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (EU_DATETIME_REGEX.test(trimmed)) {
    return trimmed;
  }

  const isoLocal = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (isoLocal) {
    const [, year, month, day, hour, minute] = isoLocal;
    return `${day}/${month}/${year} ${hour}:${minute}`;
  }

  return maskEuropeanDateTimeInput(trimmed);
}

export function europeanDateTimeToIsoLocal(value: string): string {
  const normalized = normalizeEuropeanDateTimeInput(value);
  const match = normalized.match(EU_DATETIME_REGEX);
  if (!match) {
    return "";
  }
  const [, day, month, year, hour, minute] = match;
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function isoLocalToEuropeanDateTime(value: string): string {
  if (!value?.trim()) {
    return "";
  }
  return normalizeEuropeanDateTimeInput(value);
}

export function normalizeMeetingDateInput(value?: string): string {
  if (!value?.trim()) {
    return new Date().toISOString().slice(0, 10);
  }

  const iso = parseEuropeanDateToIso(value);
  if (iso) {
    return iso;
  }

  throw new Error("INVALID_MEETING_DATE");
}
