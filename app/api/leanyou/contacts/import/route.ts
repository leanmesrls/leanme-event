import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import { previewContactImportFromRows } from "@/lib/lean-event/import-contacts";
import { parseSpreadsheetBuffer } from "@/lib/lean-event/spreadsheet-import";
import {
  forbiddenResponse,
  handleLeanEventRouteError,
  requireSession,
} from "@/lib/lean-event/server-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "contatti")
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
    const parsed = await parseSpreadsheetBuffer(
      buffer,
      file.name,
      "contacts"
    );

    if (parsed.rows.length === 0) {
      return NextResponse.json(
        { error: "Nessuna riga dati trovata. Usa il foglio «Dati» del modello." },
        { status: 400 }
      );
    }

    const preview = await previewContactImportFromRows(session, parsed.rows);
    return NextResponse.json({ ok: true, ...preview });
  } catch (error) {
    return handleLeanEventRouteError(error, "Importazione rubrica non riuscita.");
  }
}
