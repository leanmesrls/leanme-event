import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/leanyou/auth";
import { importVenuesFromRows } from "@/lib/leanyou/import-venues";
import { parseSpreadsheetBuffer } from "@/lib/leanyou/spreadsheet-import";
import {
  forbiddenResponse,
  handleLeanYouRouteError,
  requireSession,
} from "@/lib/leanyou/server-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "eventi")
    ) {
      return forbiddenResponse();
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Carica un file Excel (.xlsx) o CSV." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseSpreadsheetBuffer(buffer, file.name, "venues");

    if (parsed.rows.length === 0) {
      return NextResponse.json(
        { error: "Nessuna riga dati trovata. Usa il foglio «Dati» del modello." },
        { status: 400 }
      );
    }

    const result = await importVenuesFromRows(session, parsed.rows);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return handleLeanYouRouteError(error, "Importazione sedi non riuscita.");
  }
}
