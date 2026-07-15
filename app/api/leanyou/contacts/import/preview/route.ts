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

async function previewRows(session: Awaited<ReturnType<typeof requireSession>>, rows: Record<string, string>[]) {
  const preview = await previewContactImportFromRows(session, rows);
  return NextResponse.json({
    ok: true,
    ...preview,
    parseInfo: {
      rawRowCount: rows.length,
      source: "rows",
    },
  });
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "contatti")
    ) {
      return forbiddenResponse();
    }

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { rows?: Record<string, string>[] };
      if (!body.rows?.length) {
        return NextResponse.json(
          { error: "Nessuna riga da importare." },
          { status: 400 }
        );
      }
      return previewRows(session, body.rows);
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
    const parsed = await parseSpreadsheetBuffer(buffer, file.name, "contacts");

    if (parsed.rows.length === 0) {
      return NextResponse.json(
        {
          error:
            "Nessuna riga dati trovata. Usa il foglio «Dati» con intestazioni Nome e Cognome in prima riga.",
          parseInfo: {
            sheetName: parsed.sheetName,
            rawRowCount: parsed.rawRowCount,
          },
        },
        { status: 400 }
      );
    }

    const preview = await previewContactImportFromRows(session, parsed.rows);
    return NextResponse.json({
      ok: true,
      ...preview,
      parseInfo: {
        sheetName: parsed.sheetName,
        rawRowCount: parsed.rawRowCount,
        source: "file",
      },
    });
  } catch (error) {
    return handleLeanEventRouteError(error, "Anteprima importazione non riuscita.");
  }
}
