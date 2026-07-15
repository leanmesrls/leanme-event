import type { ContactImportColumn } from "./import-schemas";
import { CONTACT_HEADER_ALIASES, CONTACT_IMPORT_COLUMNS } from "./import-schemas";

export function normalizeImportHeader(value: string): string {
  return String(value ?? "")
    .replace(/\uFEFF/g, "")
    .trim()
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/\s+/g, " ");
}

export function resolveContactHeader(
  rawHeader: string,
  aliases: Record<string, ContactImportColumn> = CONTACT_HEADER_ALIASES,
  canonicalColumns: readonly ContactImportColumn[] = CONTACT_IMPORT_COLUMNS
): string {
  const normalized = normalizeImportHeader(rawHeader);
  if (!normalized) {
    return "";
  }

  if (aliases[normalized]) {
    return aliases[normalized];
  }

  const direct = canonicalColumns.find(
    (column) => column.toLowerCase() === normalized
  );
  if (direct) {
    return direct;
  }

  if (
    (normalized.includes("nome") || normalized === "name" || normalized === "first name") &&
    !normalized.includes("cognome") &&
    !normalized.includes("sede") &&
    !normalized.includes("last")
  ) {
    return "Nome";
  }

  if (
    normalized.includes("cognome") ||
    normalized === "surname" ||
    normalized === "last name" ||
    normalized === "lastname"
  ) {
    return "Cognome";
  }

  if (normalized.includes("mail")) {
    return "Email";
  }

  if (normalized.includes("codice fiscale") || normalized === "cf" || normalized === "p.iva") {
    return "Codice fiscale";
  }

  if (normalized.includes("telefono 2") || normalized === "cellulare 2") {
    return "Telefono 2";
  }

  if (
    normalized.includes("telefono") ||
    normalized.includes("cellulare") ||
    normalized === "mobile" ||
    normalized === "phone"
  ) {
    return "Telefono";
  }

  if (normalized.includes("organizz") || normalized.includes("azienda") || normalized === "company") {
    return "Organizzazione";
  }

  if (
    normalized === "tag" ||
    normalized === "tags" ||
    normalized === "etichette" ||
    normalized === "categoria" ||
    normalized === "categorie"
  ) {
    return "Tag";
  }

  if (normalized.includes("note") || normalized === "notes") {
    return "Note";
  }

  return String(rawHeader).trim();
}

export function mapImportHeaders(
  rawHeaders: string[],
  aliases: Record<string, string>,
  canonicalColumns: readonly string[]
): string[] {
  return rawHeaders.map((header) =>
    resolveContactHeader(header, aliases as Record<string, ContactImportColumn>, canonicalColumns as ContactImportColumn[])
  );
}

export function scoreHeaderRow(
  rawHeaders: string[],
  aliases: Record<string, string>,
  canonicalColumns: readonly string[]
): number {
  const mapped = mapImportHeaders(rawHeaders, aliases, canonicalColumns);
  let score = mapped.filter((header) => canonicalColumns.includes(header)).length;

  if (mapped.includes("Nome")) {
    score += 3;
  }
  if (mapped.includes("Cognome")) {
    score += 3;
  }

  return score;
}

export function findHeaderRowIndex(
  matrix: string[][],
  aliases: Record<string, string>,
  canonicalColumns: readonly string[]
): number {
  let bestIndex = 0;
  let bestScore = -1;

  for (let index = 0; index < Math.min(matrix.length, 30); index += 1) {
    const rawHeaders = (matrix[index] ?? []).map((cell) => String(cell ?? ""));
    const score = scoreHeaderRow(rawHeaders, aliases, canonicalColumns);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return bestScore >= 2 ? bestIndex : 0;
}

export function matrixToImportRows(
  matrix: string[][],
  aliases: Record<string, string>,
  canonicalColumns: readonly string[]
): Record<string, string>[] {
  if (matrix.length === 0) {
    return [];
  }

  const headerRowIndex = findHeaderRowIndex(matrix, aliases, canonicalColumns);
  const headers = mapImportHeaders(
    (matrix[headerRowIndex] ?? []).map((cell) => String(cell ?? "")),
    aliases,
    canonicalColumns
  );

  const rows: Record<string, string>[] = [];

  for (let rowIndex = headerRowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
    const cells = (matrix[rowIndex] ?? []).map((cell) => String(cell ?? "").trim());
    if (cells.every((value) => !value)) {
      continue;
    }

    const record: Record<string, string> = {};
    for (let colIndex = 0; colIndex < Math.max(headers.length, cells.length); colIndex += 1) {
      const key = headers[colIndex];
      if (!key) {
        continue;
      }
      const existing = record[key];
      const nextValue = cells[colIndex] ?? "";
      record[key] = existing ? `${existing} ${nextValue}`.trim() : nextValue;
    }

    rows.push(record);
  }

  return rows;
}
