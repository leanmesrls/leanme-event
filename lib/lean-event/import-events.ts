import { writeLeanEventAuditEvent } from "@/lib/lean-event/audit-log";
import { createEvent, listEvents, saveEvent } from "@/lib/lean-event/events";
import { rowHasImportData } from "@/lib/lean-event/spreadsheet-import";
import type { LeanEventSession, TenantEventStatus } from "@/types/lean-event";

export interface EventImportResult {
  created: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

function cell(row: Record<string, string>, key: string): string {
  return (row[key] ?? "").trim();
}

function parseStatus(raw: string): TenantEventStatus {
  const value = raw.toLowerCase();
  if (value === "active" || value === "attivo") {
    return "active";
  }
  if (value === "completed" || value === "concluso" || value === "chiuso") {
    return "completed";
  }
  return "draft";
}

export async function applyEventImportFromRows(
  session: LeanEventSession,
  rows: Record<string, string>[]
): Promise<EventImportResult> {
  const existing = await listEvents(session.tenantId);
  const byTitleDate = new Set(
    existing.map(
      (event) =>
        `${event.title.trim().toLowerCase()}|${event.startDate}|${event.endDate}`
    )
  );

  let created = 0;
  let skipped = 0;
  const errors: Array<{ row: number; message: string }> = [];

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    if (!rowHasImportData(row)) {
      continue;
    }

    const title = cell(row, "Titolo") || cell(row, "Nome evento");
    const startDate = cell(row, "Data inizio") || cell(row, "Inizio");
    if (!title || !startDate) {
      errors.push({
        row: rowNumber,
        message: "Titolo e Data inizio obbligatori.",
      });
      continue;
    }

    const endDate =
      cell(row, "Data fine") || cell(row, "Fine") || startDate;
    const key = `${title.toLowerCase()}|${startDate}|${endDate}`;
    if (byTitleDate.has(key)) {
      skipped += 1;
      continue;
    }

    try {
      const draft = createEvent(session, {
        title,
        startDate,
        endDate,
        cdc: cell(row, "CDC"),
        venue: cell(row, "Sede") || cell(row, "Location") || "Da definire",
        status: parseStatus(cell(row, "Stato")),
        notes: cell(row, "Note"),
      });
      await saveEvent(draft);
      byTitleDate.add(key);
      created += 1;
    } catch (error) {
      errors.push({
        row: rowNumber,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await writeLeanEventAuditEvent({
    action: "import_apply",
    tenantId: session.tenantId,
    tenantSlug: session.tenantSlug,
    userId: session.userId,
    userEmail: session.userEmail,
    resourceType: "event",
    detail: `created=${created} skipped=${skipped} errors=${errors.length}`,
  });

  return { created, skipped, errors };
}
