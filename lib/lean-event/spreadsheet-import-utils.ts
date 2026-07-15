export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function detectDelimiter(line: string): ";" | "," | "\t" {
  const semicolons = (line.match(/;/g) ?? []).length;
  const commas = (line.match(/,/g) ?? []).length;
  const tabs = (line.match(/\t/g) ?? []).length;
  if (tabs >= semicolons && tabs >= commas && tabs > 0) {
    return "\t";
  }
  if (semicolons >= commas && semicolons > 0) {
    return ";";
  }
  return ",";
}

export function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && char === delimiter) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
}

export function matrixFromSheet(
  sheet: unknown,
  xlsxUtils: {
    sheet_to_json: (
      sheet: unknown,
      options: { header: number; defval: string; raw: boolean }
    ) => unknown[][];
  }
): string[][] {
  const matrix = xlsxUtils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];

  return matrix.map((row) =>
    (row ?? []).map((cell) => String(cell ?? "").trim())
  );
}
