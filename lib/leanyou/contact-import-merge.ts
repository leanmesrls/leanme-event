import type {
  ContactImportConflictResolution,
  ContactImportDraft,
  ContactImportFieldAction,
  ContactImportFieldComparison,
  ContactImportFieldKey,
  ContactImportPreview,
  LeanYouContact,
  LeanYouContactPhone,
  LeanYouImportResult,
  LeanYouSession,
} from "@/types/leanyou";

import {
  createContact,
  findContactByEmailForTenant,
  findContactByFiscalCodeForTenant,
  getContact,
  saveContact,
} from "./contacts";
import { CONTACT_IMPORT_REQUIRED } from "./import-schemas";
import {
  formatTagsDisplay,
  mergeTags,
  normalizeTagsList,
  parseTagsRaw,
  tagsDiffer,
} from "./contact-tags";
import { cell, isContactTemplateExampleRow, rowHasImportData } from "./spreadsheet-import";

export const CONTACT_IMPORT_FIELD_LABELS: Record<ContactImportFieldKey, string> = {
  firstName: "Nome",
  lastName: "Cognome",
  email: "Email",
  fiscalCode: "Codice fiscale",
  organization: "Organizzazione",
  tags: "Tag",
  notes: "Note",
  phones: "Telefoni",
};

const FIELD_KEYS: ContactImportFieldKey[] = [
  "firstName",
  "lastName",
  "email",
  "fiscalCode",
  "organization",
  "tags",
  "notes",
  "phones",
];

function normalizePhone(number: string): string {
  return number.replace(/\D/g, "");
}

function formatPhonesDisplay(phones: LeanYouContactPhone[]): string {
  if (!phones.length) {
    return "";
  }
  return phones
    .map((phone) => (phone.label ? `${phone.label}: ${phone.number}` : phone.number))
    .join(" · ");
}

export function rowToContactDraft(
  row: Record<string, string>,
  rowNumber: number
): ContactImportDraft | null {
  if (isContactTemplateExampleRow(row)) {
    return null;
  }

  const firstName = cell(row, "Nome");
  const lastName = cell(row, "Cognome");

  if (!firstName && !lastName) {
    return null;
  }

  const phones: LeanYouContactPhone[] = [];
  const phone1 = cell(row, "Telefono");
  if (phone1) {
    phones.push({
      label: cell(row, "Etichetta telefono") || "Principale",
      number: phone1,
    });
  }
  const phone2 = cell(row, "Telefono 2");
  if (phone2) {
    phones.push({
      label: cell(row, "Etichetta telefono 2") || "Secondario",
      number: phone2,
    });
  }

  const fiscalCodeRaw = cell(row, "Codice fiscale");

  return {
    rowNumber,
    firstName,
    lastName,
    email: cell(row, "Email"),
    fiscalCode: fiscalCodeRaw ? fiscalCodeRaw.toUpperCase() : "",
    organization: cell(row, "Organizzazione"),
    tags: parseTagsRaw(cell(row, "Tag")),
    notes: cell(row, "Note"),
    phones,
  };
}

function contactToDraft(contact: LeanYouContact, rowNumber: number): ContactImportDraft {
  return {
    rowNumber,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    fiscalCode: contact.fiscalCode ?? "",
    organization: contact.organization,
    tags: contact.tags ?? [],
    notes: contact.notes,
    phones: contact.phones,
  };
}

function fieldValue(
  draft: ContactImportDraft,
  field: ContactImportFieldKey
): string {
  if (field === "phones") {
    return formatPhonesDisplay(draft.phones);
  }
  if (field === "tags") {
    return formatTagsDisplay(draft.tags);
  }
  return draft[field] || "";
}

function valuesDiffer(
  existing: ContactImportDraft,
  incoming: ContactImportDraft,
  field: ContactImportFieldKey
): boolean {
  if (field === "phones") {
    const existingNorm = new Set(
      existing.phones.map((phone) => normalizePhone(phone.number)).filter(Boolean)
    );
    const incomingNorm = incoming.phones
      .map((phone) => normalizePhone(phone.number))
      .filter(Boolean);
    if (incomingNorm.length === 0 && existing.phones.length === 0) {
      return false;
    }
    return incomingNorm.some((number) => !existingNorm.has(number));
  }

  if (field === "tags") {
    return tagsDiffer(existing.tags, incoming.tags);
  }

  const existingValue = (existing[field] as string).trim();
  const incomingValue = (incoming[field] as string).trim();

  if (field === "email") {
    return existingValue.toLowerCase() !== incomingValue.toLowerCase();
  }
  if (field === "fiscalCode") {
    return existingValue.toUpperCase() !== incomingValue.toUpperCase();
  }
  return existingValue !== incomingValue;
}

export function buildFieldComparisons(
  existing: ContactImportDraft,
  incoming: ContactImportDraft
): ContactImportFieldComparison[] {
  return FIELD_KEYS.map((field) => ({
    field,
    label: CONTACT_IMPORT_FIELD_LABELS[field],
    existing: fieldValue(existing, field) || "—",
    incoming: fieldValue(incoming, field) || "—",
    differs: valuesDiffer(existing, incoming, field),
  }));
}

export async function findDuplicateContact(
  tenantId: string,
  draft: ContactImportDraft
): Promise<
  | { status: "none" }
  | { status: "found"; contact: LeanYouContact; matchedBy: "email" | "fiscalCode" }
  | { status: "conflict"; message: string }
> {
  const byEmail = draft.email.trim()
    ? await findContactByEmailForTenant(tenantId, draft.email)
    : null;
  const byCf = draft.fiscalCode.trim()
    ? await findContactByFiscalCodeForTenant(tenantId, draft.fiscalCode)
    : null;

  if (byEmail && byCf && byEmail.id !== byCf.id) {
    return {
      status: "conflict",
      message:
        "Email e codice fiscale corrispondono a contatti diversi in rubrica.",
    };
  }

  const contact = byEmail ?? byCf;
  if (!contact) {
    return { status: "none" };
  }

  return {
    status: "found",
    contact,
    matchedBy: byEmail ? "email" : "fiscalCode",
  };
}

export function applyFieldAction(
  action: ContactImportFieldAction,
  field: ContactImportFieldKey,
  existing: LeanYouContact,
  incoming: ContactImportDraft
): Partial<LeanYouContact> {
  if (field === "phones") {
    if (action === "keep") {
      return { phones: existing.phones };
    }
    if (action === "overwrite") {
      return { phones: incoming.phones };
    }
    const seen = new Set(existing.phones.map((phone) => normalizePhone(phone.number)));
    const merged = [...existing.phones];
    for (const phone of incoming.phones) {
      const key = normalizePhone(phone.number);
      if (key && !seen.has(key)) {
        seen.add(key);
        merged.push(phone);
      }
    }
    return { phones: merged };
  }

  if (field === "tags") {
    const existingTags = existing.tags ?? [];
    if (action === "keep") {
      return { tags: existingTags };
    }
    if (action === "overwrite") {
      return { tags: normalizeTagsList(incoming.tags) };
    }
    return { tags: mergeTags(existingTags, incoming.tags) };
  }

  const existingVal =
    field === "fiscalCode" ? (existing.fiscalCode ?? "") : (existing[field] as string);
  const incomingVal = incoming[field] as string;

  if (action === "keep") {
    if (field === "fiscalCode") {
      return { fiscalCode: existing.fiscalCode };
    }
    return { [field]: existingVal };
  }

  if (action === "overwrite") {
    if (field === "fiscalCode") {
      return { fiscalCode: incomingVal.trim().toUpperCase() || undefined };
    }
    return { [field]: incomingVal.trim() };
  }

  if (field === "notes" || field === "organization") {
    const current = existingVal.trim();
    const added = incomingVal.trim();
    if (!added || current === added) {
      return { [field]: current };
    }
    if (!current) {
      return { [field]: added };
    }
    if (current.includes(added)) {
      return { [field]: current };
    }
    const separator = field === "notes" ? "\n" : " · ";
    return { [field]: `${current}${separator}${added}` };
  }

  if (field === "fiscalCode") {
    const current = existingVal.trim();
    const added = incomingVal.trim();
    return { fiscalCode: (current || added).toUpperCase() || undefined };
  }

  if (field === "email") {
    const current = existingVal.trim();
    const added = incomingVal.trim();
    return { email: current || added };
  }

  const current = existingVal.trim();
  const added = incomingVal.trim();
  return { [field]: current || added };
}

export function mergeContactWithDecisions(
  existing: LeanYouContact,
  incoming: ContactImportDraft,
  fieldActions: Partial<Record<ContactImportFieldKey, ContactImportFieldAction>>,
  overwriteAll?: boolean
): LeanYouContact {
  const next: LeanYouContact = {
    ...existing,
    updatedAt: new Date().toISOString(),
  };

  for (const field of FIELD_KEYS) {
    const action: ContactImportFieldAction = overwriteAll
      ? "overwrite"
      : fieldActions[field] ?? "keep";
    const patch = applyFieldAction(action, field, existing, incoming);
    Object.assign(next, patch);
  }

  return next;
}

export async function previewContactsImport(
  session: LeanYouSession,
  rows: Record<string, string>[]
): Promise<ContactImportPreview> {
  const preview: ContactImportPreview = {
    newRows: [],
    conflicts: [],
    errors: [],
  };

  for (let index = 0; index < rows.length; index += 1) {
    const rowNumber = index + 2;
    const draft = rowToContactDraft(rows[index]!, rowNumber);

    if (!draft) {
      if (rowHasImportData(rows[index]!)) {
        preview.errors.push({
          row: rowNumber,
          message:
            "Intestazioni non riconosciute o colonne Nome/Cognome mancanti.",
        });
      }
      continue;
    }

    if (!draft.firstName || !draft.lastName) {
      preview.errors.push({
        row: rowNumber,
        message: `${CONTACT_IMPORT_REQUIRED.join(" e ")} obbligatori.`,
      });
      continue;
    }

    const duplicate = await findDuplicateContact(session.tenantId, draft);

    if (duplicate.status === "conflict") {
      preview.errors.push({ row: rowNumber, message: duplicate.message });
      continue;
    }

    if (duplicate.status === "found") {
      const existingDraft = contactToDraft(duplicate.contact, rowNumber);
      preview.conflicts.push({
        rowNumber,
        matchedBy: duplicate.matchedBy,
        existingContactId: duplicate.contact.id,
        existing: existingDraft,
        incoming: draft,
        fields: buildFieldComparisons(existingDraft, draft),
      });
      continue;
    }

    preview.newRows.push(draft);
  }

  return preview;
}

export async function applyContactsImport(
  session: LeanYouSession,
  rows: Record<string, string>[],
  options: {
    overwriteAll?: boolean;
    resolutions?: ContactImportConflictResolution[];
  }
): Promise<LeanYouImportResult> {
  const result: LeanYouImportResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  const resolutionMap = new Map(
    (options.resolutions ?? []).map((resolution) => [resolution.rowNumber, resolution])
  );

  for (let index = 0; index < rows.length; index += 1) {
    const rowNumber = index + 2;
    const draft = rowToContactDraft(rows[index]!, rowNumber);

    if (!draft) {
      if (rowHasImportData(rows[index]!)) {
        result.errors.push({
          row: rowNumber,
          message:
            "Intestazioni non riconosciute o colonne Nome/Cognome mancanti.",
        });
      }
      continue;
    }

    if (!draft.firstName || !draft.lastName) {
      result.errors.push({
        row: rowNumber,
        message: `${CONTACT_IMPORT_REQUIRED.join(" e ")} obbligatori.`,
      });
      continue;
    }

    const duplicate = await findDuplicateContact(session.tenantId, draft);

    if (duplicate.status === "conflict") {
      result.errors.push({ row: rowNumber, message: duplicate.message });
      continue;
    }

    if (duplicate.status === "found") {
      const resolution = resolutionMap.get(rowNumber);
      if (!options.overwriteAll && !resolution) {
        result.skipped += 1;
        continue;
      }

      const contactId = resolution?.contactId ?? duplicate.contact.id;
      const existing = await getContact(session.tenantId, contactId);
      if (!existing) {
        result.errors.push({
          row: rowNumber,
          message: "Contatto esistente non trovato.",
        });
        continue;
      }

      const comparisons = buildFieldComparisons(
        contactToDraft(existing, rowNumber),
        draft
      );
      const hasChanges = comparisons.some((field) => field.differs);

      if (!hasChanges && !options.overwriteAll) {
        result.skipped += 1;
        continue;
      }

      const merged = mergeContactWithDecisions(
        existing,
        draft,
        resolution?.fields ?? {},
        options.overwriteAll
      );
      await saveContact(merged);
      result.updated += 1;
      continue;
    }

    const contact = createContact(session, {
      firstName: draft.firstName,
      lastName: draft.lastName,
      email: draft.email,
      phones: draft.phones,
      organization: draft.organization,
      tags: draft.tags,
      notes: draft.notes,
    });
    if (draft.fiscalCode) {
      contact.fiscalCode = draft.fiscalCode;
    }
    await saveContact(contact);
    result.created += 1;
  }

  return result;
}
