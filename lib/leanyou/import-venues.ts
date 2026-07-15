import type { LeanYouImportResult, LeanYouSession } from "@/types/leanyou";

import {
  VENUE_IMPORT_REQUIRED,
} from "./import-schemas";
import { cell, isExampleRow } from "./spreadsheet-import";
import {
  createVenue,
  findVenueByIdentityForTenant,
  saveVenue,
} from "./venues";

export async function importVenuesFromRows(
  session: LeanYouSession,
  rows: Record<string, string>[]
): Promise<LeanYouImportResult> {
  const result: LeanYouImportResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (let index = 0; index < rows.length; index += 1) {
    const rowNumber = index + 2;
    const row = rows[index]!;

    if (isExampleRow(row, "esempio") || isExampleRow(row, "unahotel")) {
      continue;
    }

    const name = cell(row, "Nome sede");
    const address = cell(row, "Indirizzo sede");
    const city = cell(row, "Città");
    const province = cell(row, "Provincia sede");

    if (!name && !address && !city && !province) {
      continue;
    }

    const missing = VENUE_IMPORT_REQUIRED.filter((field) => !cell(row, field));
    if (missing.length > 0) {
      result.errors.push({
        row: rowNumber,
        message: `Campi obbligatori mancanti: ${missing.join(", ")}.`,
      });
      continue;
    }

    const existing = await findVenueByIdentityForTenant(session.tenantId, {
      name,
      address,
      city,
    });
    if (existing) {
      result.skipped += 1;
      continue;
    }

    const venue = createVenue(session, {
      name,
      address,
      city,
      province,
      postalCode: cell(row, "CAP"),
      phone: cell(row, "Telefono"),
      email: cell(row, "Email"),
      website: cell(row, "Sito web"),
      externalUrl: cell(row, "URL scheda esterna"),
      coverImageUrl: cell(row, "URL immagine"),
      starCategory: cell(row, "Categoria stelle"),
      notes: cell(row, "Note"),
    });

    await saveVenue(venue);
    result.created += 1;
  }

  return result;
}
