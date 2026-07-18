export type LeanEventDocumentKind =
  | "cv"
  | "faculty_pack"
  | "attestato_partecipazione"
  | "certificazione_ecm"
  | "agenas"
  | "travel_id"
  | "supplier_agreement"
  | "other";

export const LEAN_EVENT_DOCUMENT_KIND_OPTIONS: Array<{
  value: LeanEventDocumentKind;
  label: string;
}> = [
  { value: "cv", label: "CV" },
  { value: "faculty_pack", label: "Faculty pack" },
  { value: "attestato_partecipazione", label: "Attestato partecipazione" },
  { value: "certificazione_ecm", label: "Certificazione ECM" },
  { value: "agenas", label: "Age.na.s" },
  { value: "travel_id", label: "Documento viaggio" },
  { value: "supplier_agreement", label: "Accordo fornitore" },
  { value: "other", label: "Altro" },
];

export function formatDocumentKind(kind: LeanEventDocumentKind): string {
  return (
    LEAN_EVENT_DOCUMENT_KIND_OPTIONS.find((option) => option.value === kind)
      ?.label ?? kind
  );
}

export function formatDocumentBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "—";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
