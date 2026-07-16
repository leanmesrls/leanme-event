import { writeLeanEventAuditEvent } from "@/lib/lean-event/audit-log";
import { createSupplier, listSuppliers, saveSupplier } from "@/lib/lean-event/suppliers";
import { isValidSupplierCategory } from "@/lib/lean-event/supplier-categories";
import { rowHasImportData } from "@/lib/lean-event/spreadsheet-import";
import type { LeanEventSession } from "@/types/lean-event";

export interface SupplierImportResult {
  created: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

function cell(row: Record<string, string>, key: string): string {
  return (row[key] ?? "").trim();
}

export async function applySupplierImportFromRows(
  session: LeanEventSession,
  rows: Record<string, string>[]
): Promise<SupplierImportResult> {
  const existing = await listSuppliers(session.tenantId);
  const byNameEmail = new Set(
    existing.map(
      (s) =>
        `${s.name.trim().toLowerCase()}|${s.email.trim().toLowerCase()}`
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

    const name = cell(row, "Nome fornitore") || cell(row, "Nome");
    if (!name) {
      errors.push({ row: rowNumber, message: "Nome fornitore obbligatorio." });
      continue;
    }

    const email = cell(row, "Email");
    const key = `${name.toLowerCase()}|${email.toLowerCase()}`;
    if (byNameEmail.has(key)) {
      skipped += 1;
      continue;
    }

    const categoryRaw = cell(row, "Categoria") || "collaboratori";
    const categoryId = isValidSupplierCategory(categoryRaw)
      ? categoryRaw
      : "collaboratori";

    try {
      const draft = createSupplier(session, {
        name,
        categoryId,
        email,
        phone: cell(row, "Telefono"),
        address: cell(row, "Indirizzo"),
        city: cell(row, "Città") || cell(row, "Citta"),
        province: cell(row, "Provincia"),
        vatNumber: cell(row, "Partita IVA") || cell(row, "P.IVA"),
        contactPerson: cell(row, "Referente"),
        notes: cell(row, "Note"),
      });
      await saveSupplier(draft);
      byNameEmail.add(key);
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
    resourceType: "supplier",
    detail: `created=${created} skipped=${skipped} errors=${errors.length}`,
  });

  return { created, skipped, errors };
}
