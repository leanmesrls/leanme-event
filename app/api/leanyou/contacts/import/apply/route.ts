import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/leanyou/auth";
import { applyContactImportFromRows } from "@/lib/leanyou/import-contacts";
import { parseSpreadsheetBuffer } from "@/lib/leanyou/spreadsheet-import";
import {
  forbiddenResponse,
  handleLeanYouRouteError,
  requireSession,
} from "@/lib/leanyou/server-auth";
import type { ContactImportApplyPayload } from "@/types/leanyou";

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

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as ContactImportApplyPayload & {
        rows?: Record<string, string>[];
      };

      if (!body.rows?.length) {
        return NextResponse.json({ error: "Nessuna riga da importare." }, { status: 400 });
      }

      const result = await applyContactImportFromRows(session, body.rows, body);
      return NextResponse.json({ ok: true, ...result });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const decisionsRaw = formData.get("decisions");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Carica un file Excel (.xlsx) o CSV." },
        { status: 400 }
      );
    }

    let payload: ContactImportApplyPayload = { resolutions: [] };
    if (typeof decisionsRaw === "string" && decisionsRaw.trim()) {
      payload = JSON.parse(decisionsRaw) as ContactImportApplyPayload;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseSpreadsheetBuffer(buffer, file.name, "contacts");

    if (parsed.rows.length === 0) {
      return NextResponse.json(
        { error: "Nessuna riga dati trovata nel file." },
        { status: 400 }
      );
    }

    const result = await applyContactImportFromRows(session, parsed.rows, payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return handleLeanYouRouteError(error, "Importazione rubrica non riuscita.");
  }
}
