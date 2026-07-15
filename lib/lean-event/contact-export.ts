import type { LeanEventContact } from "@/types/lean-event";
import { contactHasTag, formatTagsDisplay } from "./contact-tags";

const EXPORT_HEADERS = [
  "Nome",
  "Cognome",
  "Email",
  "Codice fiscale",
  "Telefono",
  "Etichetta telefono",
  "Telefono 2",
  "Etichetta telefono 2",
  "Organizzazione",
  "Tag",
  "Note",
] as const;

function escapeCsvCell(value: string): string {
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function contactToRow(contact: LeanEventContact): string[] {
  return [
    contact.firstName,
    contact.lastName,
    contact.email,
    contact.fiscalCode ?? "",
    contact.phones[0]?.number ?? "",
    contact.phones[0]?.label ?? "",
    contact.phones[1]?.number ?? "",
    contact.phones[1]?.label ?? "",
    contact.organization,
    formatTagsDisplay(contact.tags),
    contact.notes,
  ];
}

export function buildContactsCsv(contacts: LeanEventContact[]): string {
  const lines = [
    EXPORT_HEADERS.join(";"),
    ...contacts.map((contact) =>
      contactToRow(contact).map(escapeCsvCell).join(";")
    ),
  ];
  return `\uFEFF${lines.join("\n")}`;
}

export function downloadContactsCsv(
  contacts: LeanEventContact[],
  filename = "lean-event-rubrica-contatti.csv"
): void {
  const csv = buildContactsCsv(contacts);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function contactMatchesQuery(contact: LeanEventContact, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const haystack = [
    contact.firstName,
    contact.lastName,
    contact.email,
    contact.fiscalCode ?? "",
    contact.organization,
    contact.notes,
    formatTagsDisplay(contact.tags),
    ...contact.phones.map((phone) => `${phone.label} ${phone.number}`),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

export function contactMatchesFilters(
  contact: LeanEventContact,
  query: string,
  tagFilter: string
): boolean {
  return contactMatchesQuery(contact, query) && contactHasTag(contact, tagFilter);
}
