import type { EventSupplierWithSupplier } from "@/lib/leanyou/event-suppliers";
import { getSupplierCategoryLabel } from "@/lib/leanyou/supplier-categories";
import type { LeanYouSupplier } from "@/types/leanyou";

function escapeCsvCell(value: string): string {
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadCsv(rows: string[][], filename: string): void {
  const csv = `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(";")).join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const RUBRICA_HEADERS = [
  "Ragione sociale",
  "Categoria",
  "Email",
  "Telefono",
  "Referente",
  "P.IVA",
  "Città",
  "Provincia",
  "Indirizzo",
  "Note",
  "Accordi archiviati",
] as const;

export function downloadSuppliersCsv(
  suppliers: LeanYouSupplier[],
  filename = "leanyou-rubrica-fornitori.csv"
): void {
  const rows: string[][] = [
    [...RUBRICA_HEADERS],
    ...suppliers.map((supplier) => [
      supplier.name,
      getSupplierCategoryLabel(supplier.categoryId),
      supplier.email,
      supplier.phone,
      supplier.contactPerson,
      supplier.vatNumber,
      supplier.city,
      supplier.province,
      supplier.address,
      supplier.notes,
      String(supplier.agreements?.length ?? 0),
    ]),
  ];
  downloadCsv(rows, filename);
}

const EVENT_HEADERS = [
  "Fornitore",
  "Categoria evento",
  "Note incarico",
  "Documenti",
  "Email registrate",
] as const;

export function downloadEventSuppliersCsv(
  links: EventSupplierWithSupplier[],
  filename = "leanyou-fornitori-evento.csv"
): void {
  const rows: string[][] = [
    [...EVENT_HEADERS],
    ...links.map((link) => [
      link.supplier?.name ?? "—",
      getSupplierCategoryLabel(link.categoryId),
      link.roleNotes,
      String(link.documents?.length ?? 0),
      String(link.emails?.length ?? 0),
    ]),
  ];
  downloadCsv(rows, filename);
}
