import type { LeanEventContact } from "@/types/lean-event";

export function formatContactName(contact: LeanEventContact): string {
  return `${contact.firstName} ${contact.lastName}`.trim();
}
