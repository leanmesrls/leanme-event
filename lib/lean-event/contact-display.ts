import type { LeanEventContact } from "@/types/lean-event";

export function formatContactName(contact: LeanEventContact): string {
  return `${contact.firstName} ${contact.lastName}`.trim();
}

/** Telefono principale (etichetta Principale o primo in elenco). */
export function getContactPrimaryPhone(contact: LeanEventContact): string {
  const phones = contact.phones ?? [];
  const primary =
    phones.find((phone) =>
      phone.label.trim().toLowerCase().includes("princip")
    ) ?? phones[0];
  return primary?.number?.trim() || "—";
}

export function formatContactOrganizationProvince(
  contact: LeanEventContact
): string {
  return contact.organizationProvince?.trim().toUpperCase() || "—";
}
