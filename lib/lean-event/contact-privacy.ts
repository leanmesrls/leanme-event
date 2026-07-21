import type {
  LeanEventContact,
  LeanEventContactEmail,
  LeanEventContactPrivacyConsent,
} from "@/types/lean-event";

import { DEFAULT_PRIVACY_CONSENT_DEFS } from "./contact-catalogs";
import { DEFAULT_COUNTRY, normalizeAddressFields } from "./geo-italy";

export function defaultPrivacyConsents(): LeanEventContactPrivacyConsent[] {
  const now = new Date().toISOString();
  return DEFAULT_PRIVACY_CONSENT_DEFS.map((item) => ({
    id: item.id,
    label: item.label,
    granted: item.id === "data_processing",
    grantedAt: item.id === "data_processing" ? now : null,
  }));
}

export function normalizePrivacyConsents(
  consents?: LeanEventContactPrivacyConsent[] | null
): LeanEventContactPrivacyConsent[] {
  const incoming = Array.isArray(consents) ? consents : [];
  const byId = new Map(
    incoming
      .filter((item) => item?.id?.trim())
      .map((item) => [
        item.id.trim(),
        {
          id: item.id.trim(),
          label: item.label?.trim() || item.id.trim(),
          granted: Boolean(item.granted),
          grantedAt: item.grantedAt ?? null,
        } satisfies LeanEventContactPrivacyConsent,
      ])
  );

  const now = new Date().toISOString();
  const base = DEFAULT_PRIVACY_CONSENT_DEFS.map((def) => {
    const existing = byId.get(def.id);
    if (existing) {
      byId.delete(def.id);
      if (def.id === "data_processing") {
        return {
          ...existing,
          label: def.label,
          granted: true,
          grantedAt: existing.grantedAt || now,
        };
      }
      return {
        ...existing,
        label: def.label,
      };
    }
    return {
      id: def.id,
      label: def.label,
      granted: def.id === "data_processing",
      grantedAt: def.id === "data_processing" ? now : null,
    };
  });

  const custom = Array.from(byId.values()).slice(0, 2);
  return [...base, ...custom];
}

export function normalizeContactEmails(
  contact: Pick<LeanEventContact, "email" | "emails">
): LeanEventContactEmail[] {
  const fromList = (contact.emails ?? [])
    .map((item) => ({
      label: item.label?.trim() || "Principale",
      address: item.address?.trim() ?? "",
    }))
    .filter((item) => item.address);

  if (fromList.length > 0) {
    return fromList;
  }

  const primary = contact.email?.trim() ?? "";
  if (primary) {
    return [{ label: "Principale", address: primary }];
  }

  return [{ label: "Principale", address: "" }];
}

export function primaryEmailFromList(emails: LeanEventContactEmail[]): string {
  return emails.find((item) => item.address.trim())?.address.trim() ?? "";
}

export function normalizeContactFields(
  contact: LeanEventContact
): LeanEventContact {
  const emails = normalizeContactEmails(contact);
  const residence = normalizeAddressFields({
    address: contact.address,
    city: contact.city,
    province: contact.province,
    region: contact.region,
    postalCode: contact.postalCode,
    country: contact.country,
  });
  const organization = normalizeAddressFields({
    address: contact.organizationAddress,
    city: contact.organizationCity,
    province: contact.organizationProvince,
    region: contact.organizationRegion,
    postalCode: contact.organizationPostalCode,
    country: contact.organizationCountry,
  });

  return {
    ...contact,
    vocative: contact.vocative?.trim() ?? "",
    honorificTitle: contact.honorificTitle?.trim() ?? "",
    emails,
    email: primaryEmailFromList(emails) || contact.email?.trim() || "",
    birthDate: contact.birthDate?.trim() ?? "",
    address: residence.address,
    city: residence.city,
    province: residence.province,
    region: residence.region,
    postalCode: residence.postalCode,
    country: residence.country || DEFAULT_COUNTRY,
    organizationAddress: organization.address,
    organizationCity: organization.city,
    organizationProvince: organization.province,
    organizationRegion: organization.region,
    organizationPostalCode: organization.postalCode,
    organizationCountry: organization.country || DEFAULT_COUNTRY,
    organizationRole: contact.organizationRole?.trim() ?? "",
    dietaryNotes: contact.dietaryNotes?.trim() ?? "",
    mobilityNotes: contact.mobilityNotes?.trim() ?? "",
    personalRequests: contact.personalRequests?.trim() ?? "",
    privacyConsents: normalizePrivacyConsents(contact.privacyConsents),
  };
}

export function hasBaseDataProcessingConsent(
  consents?: LeanEventContactPrivacyConsent[] | null
): boolean {
  const normalized = normalizePrivacyConsents(consents);
  return Boolean(
    normalized.find((item) => item.id === "data_processing")?.granted
  );
}

export function togglePrivacyConsent(
  consents: LeanEventContactPrivacyConsent[],
  id: string,
  granted: boolean
): LeanEventContactPrivacyConsent[] {
  if (id === "data_processing" && !granted) {
    return consents;
  }
  return consents.map((consent) =>
    consent.id === id
      ? {
          ...consent,
          granted,
          grantedAt: granted ? new Date().toISOString() : null,
        }
      : consent
  );
}

export function addCustomPrivacyConsent(
  consents: LeanEventContactPrivacyConsent[],
  label: string
): LeanEventContactPrivacyConsent[] {
  const trimmed = label.trim();
  if (!trimmed) {
    return consents;
  }
  const customCount = consents.filter(
    (consent) =>
      !DEFAULT_PRIVACY_CONSENT_DEFS.some((def) => def.id === consent.id)
  ).length;
  if (customCount >= 2) {
    return consents;
  }
  const id = `custom_${Date.now().toString(36)}`;
  return [
    ...consents,
    {
      id,
      label: trimmed,
      granted: false,
      grantedAt: null,
    },
  ];
}
