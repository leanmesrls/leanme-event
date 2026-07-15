import type {
  LeonardoSupplierDocument,
  LeonardoSupplierDocumentKind,
} from "@/types/leanyou";

const DOCUMENT_KIND_LABELS: Record<LeonardoSupplierDocumentKind, string> = {
  accordo_generale: "Accordo generale",
  preventivo: "Preventivo",
  fattura: "Fattura",
  altro: "Altro",
};

export function getSupplierDocumentKindLabel(
  kind: LeonardoSupplierDocumentKind
): string {
  return DOCUMENT_KIND_LABELS[kind] ?? kind;
}

export function supplierMatchesQuery(
  supplier: { name: string; email: string; city: string; contactPerson: string; vatNumber: string },
  query: string
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return [
    supplier.name,
    supplier.email,
    supplier.city,
    supplier.contactPerson,
    supplier.vatNumber,
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

export function sortSupplierDocuments(
  documents: LeonardoSupplierDocument[]
): LeonardoSupplierDocument[] {
  return [...documents].sort((a, b) => {
    const dateCompare = b.documentDate.localeCompare(a.documentDate, "it");
    if (dateCompare !== 0) {
      return dateCompare;
    }
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function getSupplierCompletenessIssues(
  supplier: {
    email: string;
    phone: string;
    vatNumber: string;
    agreements?: unknown[];
  }
): string[] {
  const issues: string[] = [];
  if (!supplier.email.trim()) {
    issues.push("Email");
  }
  if (!supplier.phone.trim()) {
    issues.push("Tel.");
  }
  if (!supplier.vatNumber.trim()) {
    issues.push("P.IVA");
  }
  if (!(supplier.agreements?.length ?? 0)) {
    issues.push("Accordi");
  }
  return issues;
}

export function getEventSupplierCompletenessIssues(link: {
  roleNotes: string;
  documents?: unknown[];
  emails?: unknown[];
}): string[] {
  const issues: string[] = [];
  if (!link.roleNotes.trim()) {
    issues.push("Note");
  }
  if (!(link.documents?.length ?? 0)) {
    issues.push("Doc.");
  }
  if (!(link.emails?.length ?? 0)) {
    issues.push("Email");
  }
  return issues;
}
