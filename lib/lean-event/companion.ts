import type { LeanEventContact, LeonardoCompanionPerson } from "@/types/lean-event";

export function emptyCompanionPerson(
  partial?: Partial<LeonardoCompanionPerson>
): LeonardoCompanionPerson {
  return {
    firstName: partial?.firstName?.trim() ?? "",
    lastName: partial?.lastName?.trim() ?? "",
    phone: partial?.phone?.trim() ?? "",
    email: partial?.email?.trim() ?? "",
  };
}

export function normalizeCompanionPerson(
  value?: Partial<LeonardoCompanionPerson> | null
): LeonardoCompanionPerson {
  return emptyCompanionPerson(value ?? undefined);
}

export function companionFromContact(contact: LeanEventContact): LeonardoCompanionPerson {
  return {
    firstName: contact.firstName.trim(),
    lastName: contact.lastName.trim(),
    phone: contact.phones[0]?.number?.trim() ?? "",
    email: contact.email.trim(),
  };
}

export function formatCompanionName(
  person?: Partial<LeonardoCompanionPerson> | null
): string {
  if (!person) {
    return "";
  }
  return `${person.firstName?.trim() ?? ""} ${person.lastName?.trim() ?? ""}`.trim();
}

export function splitLegacyPersonName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export function hasCompanionIdentity(
  person?: Partial<LeonardoCompanionPerson> | null
): boolean {
  return Boolean(formatCompanionName(person));
}

export function isCompanionComplete(
  person?: Partial<LeonardoCompanionPerson> | null
): boolean {
  const normalized = normalizeCompanionPerson(person);
  return Boolean(normalized.firstName.trim() && normalized.lastName.trim());
}
