import type { LeanYouContact } from "@/types/leanyou";

export function formatContactName(contact: LeanYouContact): string {
  return `${contact.firstName} ${contact.lastName}`.trim();
}
