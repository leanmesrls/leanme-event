import {
  detectDelimiter,
  splitCsvLine,
  stripBom,
} from "./spreadsheet-import-utils";
import {
  findHeaderRowIndex,
  resolveContactHeader,
} from "./import-header-mapping";
import {
  CONTACT_HEADER_ALIASES,
  CONTACT_IMPORT_COLUMNS,
  type ContactImportColumn,
} from "./import-schemas";

export type PasteColumnTarget = ContactImportColumn | "";

export interface PasteImportMatrix {
  matrix: string[][];
  headerRowIndex: number;
  headers: string[];
}

export interface PasteColumnMapping {
  columnIndex: number;
  sourceHeader: string;
  target: PasteColumnTarget;
}

export const PASTE_COLUMN_OPTIONS: Array<{ value: PasteColumnTarget; label: string }> = [
  { value: "", label: "— Ignora —" },
  ...CONTACT_IMPORT_COLUMNS.map((column) => ({
    value: column as PasteColumnTarget,
    label: column,
  })),
];

export function parsePasteText(text: string): PasteImportMatrix {
  const normalized = stripBom(text.trim());
  if (!normalized) {
    return { matrix: [], headerRowIndex: 0, headers: [] };
  }

  const lines = normalized.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const delimiter = detectDelimiter(lines[0] ?? "");
  const matrix = lines.map((line) => splitCsvLine(line, delimiter));
  const headerRowIndex = findHeaderRowIndex(
    matrix,
    CONTACT_HEADER_ALIASES,
    CONTACT_IMPORT_COLUMNS
  );
  const headers = (matrix[headerRowIndex] ?? []).map((cell) => String(cell ?? "").trim());

  return { matrix, headerRowIndex, headers };
}

export function suggestPasteColumnMappings(headers: string[]): PasteColumnMapping[] {
  return headers.map((sourceHeader, columnIndex) => ({
    columnIndex,
    sourceHeader,
    target: resolveContactHeader(sourceHeader) as PasteColumnTarget,
  }));
}

export function buildRowsFromPasteMapping(
  matrix: string[][],
  headerRowIndex: number,
  mappings: PasteColumnMapping[]
): Record<string, string>[] {
  const rows: Record<string, string>[] = [];

  for (let rowIndex = headerRowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
    const cells = (matrix[rowIndex] ?? []).map((cell) => String(cell ?? "").trim());
    if (cells.every((value) => !value)) {
      continue;
    }

    const record: Record<string, string> = {};
    for (const mapping of mappings) {
      if (!mapping.target) {
        continue;
      }
      const value = cells[mapping.columnIndex] ?? "";
      if (!value) {
        continue;
      }
      const existing = record[mapping.target];
      record[mapping.target] = existing ? `${existing} ${value}`.trim() : value;
    }

    if (Object.keys(record).length > 0) {
      rows.push(record);
    }
  }

  return rows;
}

export function autoMapPasteHeaders(headers: string[]): PasteColumnMapping[] {
  const mappings = suggestPasteColumnMappings(headers);
  const usedTargets = new Set<string>();

  return mappings.map((mapping) => {
    if (!mapping.target || usedTargets.has(mapping.target)) {
      return { ...mapping, target: "" };
    }
    usedTargets.add(mapping.target);
    return mapping;
  });
}

export function pasteHeadersLookLikeData(headers: string[]): boolean {
  if (headers.length < 2) {
    return true;
  }

  const score = headers.filter((header) => resolveContactHeader(header) !== header.trim())
    .length;

  return score < 2;
}

export function remapPasteMatrixAsHeaderless(
  matrix: string[][],
  mappings: PasteColumnMapping[]
): { matrix: string[][]; headerRowIndex: number; headers: string[] } {
  const syntheticHeaders = mappings.map(
    (mapping, index) => mapping.sourceHeader || `Colonna ${index + 1}`
  );
  return {
    matrix: [syntheticHeaders, ...matrix],
    headerRowIndex: 0,
    headers: syntheticHeaders,
  };
}
