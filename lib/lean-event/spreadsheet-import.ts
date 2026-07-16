import {
  CONTACT_HEADER_ALIASES,
  CONTACT_IMPORT_COLUMNS,
  EVENT_HEADER_ALIASES,
  EVENT_IMPORT_COLUMNS,
  SUPPLIER_HEADER_ALIASES,
  SUPPLIER_IMPORT_COLUMNS,
  VENUE_HEADER_ALIASES,
  VENUE_IMPORT_COLUMNS,
} from "./import-schemas";
import { matrixToImportRows } from "./import-header-mapping";
import {
  detectDelimiter,
  splitCsvLine,
  stripBom,
} from "./spreadsheet-import-utils";

export type LeanEventImportKind =
  | "contacts"
  | "venues"
  | "suppliers"
  | "events";

export interface ParsedSpreadsheet {
  rows: Record<string, string>[];
  sheetName: string;
  rawRowCount: number;
}

function schemaForKind(kind: LeanEventImportKind): {
  aliases: Record<string, string>;
  columns: readonly string[];
} {
  switch (kind) {
    case "contacts":
      return {
        aliases: CONTACT_HEADER_ALIASES,
        columns: CONTACT_IMPORT_COLUMNS,
      };
    case "venues":
      return {
        aliases: VENUE_HEADER_ALIASES,
        columns: VENUE_IMPORT_COLUMNS,
      };
    case "suppliers":
      return {
        aliases: SUPPLIER_HEADER_ALIASES,
        columns: SUPPLIER_IMPORT_COLUMNS,
      };
    case "events":
      return {
        aliases: EVENT_HEADER_ALIASES,
        columns: EVENT_IMPORT_COLUMNS,
      };
  }
}

function rowsFromMatrix(
  matrix: string[][],
  aliases: Record<string, string>,
  canonicalColumns: readonly string[]
): Record<string, string>[] {
  return matrixToImportRows(matrix, aliases, canonicalColumns);
}

export function parseCsvBuffer(
  buffer: Buffer,
  kind: LeanEventImportKind
): ParsedSpreadsheet {
  const text = stripBom(buffer.toString("utf8"));
  const lines = text.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length === 0) {
    return { rows: [], sheetName: "CSV", rawRowCount: 0 };
  }

  const delimiter = detectDelimiter(lines[0] ?? "");
  const matrix = lines.map((line) => splitCsvLine(line, delimiter));
  const { aliases, columns } = schemaForKind(kind);
  const rows = rowsFromMatrix(matrix, aliases, columns);
  return {
    sheetName: "CSV",
    rows,
    rawRowCount: Math.max(matrix.length - 1, 0),
  };
}

function parseExcelSheet(
  sheet: unknown,
  sheetName: string,
  kind: LeanEventImportKind,
  sheetToMatrix: (sheet: unknown) => string[][]
): ParsedSpreadsheet {
  if (!sheet) {
    return { rows: [], sheetName, rawRowCount: 0 };
  }

  const matrix = sheetToMatrix(sheet);
  const { aliases, columns } = schemaForKind(kind);
  const rows = rowsFromMatrix(matrix, aliases, columns);

  return {
    sheetName,
    rows,
    rawRowCount: Math.max(matrix.length - 1, 0),
  };
}

export async function parseSpreadsheetBuffer(
  buffer: Buffer,
  filename: string,
  kind: LeanEventImportKind
): Promise<ParsedSpreadsheet> {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    return parseCsvBuffer(buffer, kind);
  }

  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetToMatrix = (sheet: unknown): string[][] => {
      const matrix = XLSX.utils.sheet_to_json(sheet as import("xlsx").WorkSheet, {
        header: 1,
        defval: "",
        raw: false,
      }) as unknown[][];
      return matrix.map((row) =>
        (row ?? []).map((cell) => String(cell ?? "").trim())
      );
    };

    let best: ParsedSpreadsheet = { rows: [], sheetName: "", rawRowCount: 0 };

    for (const sheetName of workbook.SheetNames) {
      if (["istruzioni", "instructions", "readme"].includes(sheetName.toLowerCase())) {
        continue;
      }

      const parsed = parseExcelSheet(
        workbook.Sheets[sheetName],
        sheetName,
        kind,
        sheetToMatrix
      );

      if (parsed.rows.length > best.rows.length) {
        best = parsed;
      }
    }

    if (best.rows.length === 0) {
      const fallbackName =
        workbook.SheetNames.find(
          (name) => name.trim().toLowerCase() === "dati"
        ) ?? workbook.SheetNames[0] ?? "Sheet1";

      best = parseExcelSheet(
        workbook.Sheets[fallbackName],
        fallbackName,
        kind,
        sheetToMatrix
      );
    }

    return best;
  }

  throw new Error(
    "Formato non supportato. Usa .xlsx o .csv esportato dal modello LeanEvent."
  );
}

export function cell(row: Record<string, string>, key: string): string {
  const direct = row[key]?.trim();
  if (direct) {
    return direct;
  }

  const normalizedKey = key.toLowerCase();
  for (const [header, value] of Object.entries(row)) {
    if (header.toLowerCase() === normalizedKey && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

export function isExampleRow(row: Record<string, string>, marker: string): boolean {
  const values = Object.values(row).join(" ").toLowerCase();
  return values.includes(marker.toLowerCase());
}

/** Riga di esempio del modello Excel Lean Event — non importare. */
export function isContactTemplateExampleRow(row: Record<string, string>): boolean {
  const note = cell(row, "Note").toLowerCase();
  if (note.includes("riga di esempio") || note.includes("puoi eliminarla")) {
    return true;
  }

  const email = cell(row, "Email").toLowerCase();
  if (email.includes("@esempio.")) {
    return true;
  }

  const firstName = cell(row, "Nome").toLowerCase();
  const lastName = cell(row, "Cognome").toLowerCase();
  return firstName === "mario" && lastName === "rossi" && email.includes("esempio");
}

export function rowHasImportData(row: Record<string, string>): boolean {
  return Object.values(row).some((value) => value.trim().length > 0);
}
