import { detectDelimiter, splitCsvLine, stripBom } from "./spreadsheet-import-utils";

const EMAIL_RE = /[\w.+-]+@[\w.-]+\.\w+/gi;

export function extractEmailsFromText(text: string): string[] {
  const normalized = stripBom(text.trim());
  if (!normalized) {
    return [];
  }

  const emails = new Set<string>();
  for (const match of normalized.matchAll(EMAIL_RE)) {
    emails.add(match[0].trim().toLowerCase());
  }
  return [...emails];
}

export function extractEmailsFromMatrix(matrix: string[][]): string[] {
  const emails = new Set<string>();
  for (const row of matrix) {
    for (const cell of row) {
      for (const match of cell.matchAll(EMAIL_RE)) {
        emails.add(match[0].trim().toLowerCase());
      }
    }
  }
  return [...emails];
}

export function parseGuestListPaste(text: string): string[][] {
  const normalized = stripBom(text.trim());
  if (!normalized) {
    return [];
  }
  const delimiter = detectDelimiter(normalized.split(/\r?\n/)[0] ?? "");
  return normalized
    .split(/\r?\n/)
    .map((line) => splitCsvLine(line, delimiter))
    .filter((row) => row.some((cell) => cell.trim()));
}

export function parseGuestListCsvText(text: string): string[][] {
  return parseGuestListPaste(text);
}
