"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { LeonardoAddressFields } from "@/components/lean-event/LeonardoAddressFields";
import { LeonardoCollapsiblePanel } from "@/components/lean-event/LeonardoCollapsiblePanel";
import { LeonardoContactLinkedEvents } from "@/components/lean-event/LeonardoContactLinkedEvents";
import { LeonardoCreatableSelect } from "@/components/lean-event/LeonardoCreatableSelect";
import { LeonardoDateInput } from "@/components/lean-event/LeonardoDateInput";
import { LeonardoEntityVersionsPanel } from "@/components/lean-event/LeonardoEntityVersionsPanel";
import { LeonardoRevisionConflictDialog } from "@/components/lean-event/LeonardoRevisionConflictDialog";
import { LeonardoRevisionStaleBanner } from "@/components/lean-event/LeonardoRevisionStaleBanner";
import {
  CONTACT_ORGANIZATION_ROLES,
  CONTACT_TITLES,
  CONTACT_VOCATIVES,
} from "@/lib/lean-event/contact-catalogs";
import {
  addCustomPrivacyConsent,
  defaultPrivacyConsents,
  hasBaseDataProcessingConsent,
  normalizeContactEmails,
  normalizePrivacyConsents,
  primaryEmailFromList,
  togglePrivacyConsent,
} from "@/lib/lean-event/contact-privacy";
import { formatTagsDisplay } from "@/lib/lean-event/contact-tags";
import { isoDateToEuropeanDate } from "@/lib/lean-event/dates";
import { DEFAULT_COUNTRY } from "@/lib/lean-event/geo-italy";
import { leanEventLeonardoContactPath } from "@/lib/lean-event/paths";
import { isRevisionConflictPayload } from "@/lib/lean-event/revision-conflict";
import { useEntityRevisionWatch } from "@/lib/lean-event/use-entity-revision-watch";
import type { ContactAssignmentWithEvent } from "@/lib/lean-event/event-assignments";
import type {
  LeanEventContact,
  LeanEventContactEmail,
  LeanEventContactPhone,
  LeanEventContactPrivacyConsent,
} from "@/types/lean-event";

interface LeonardoContactSheetContentProps {
  tenantSlug: string;
  contact: LeanEventContact;
  onContactChange: (contact: LeanEventContact) => void;
  assignments?: ContactAssignmentWithEvent[];
  onDelete?: () => void;
  deleting?: boolean;
  mode?: "create" | "edit";
  onCreated?: (contact: LeanEventContact) => void;
  closeOnSuccess?: boolean;
  onClose?: () => void;
}

function emptyPhone(): LeanEventContactPhone {
  return { label: "Principale", number: "" };
}

function contactToForm(contact: LeanEventContact) {
  const emails = normalizeContactEmails(contact);
  const phones =
    contact.phones.length > 0
      ? contact.phones.map((phone) => ({
          label: phone.label || "Principale",
          number: phone.number ?? "",
        }))
      : [emptyPhone()];

  return {
    vocative: contact.vocative ?? "",
    honorificTitle: contact.honorificTitle ?? "",
    firstName: contact.firstName,
    lastName: contact.lastName,
    emails,
    fiscalCode: contact.fiscalCode ?? "",
    phones,
    birthDate: contact.birthDate
      ? isoDateToEuropeanDate(contact.birthDate) || contact.birthDate
      : "",
    address: contact.address ?? "",
    city: contact.city ?? "",
    province: contact.province ?? "",
    region: contact.region ?? "",
    postalCode: contact.postalCode ?? "",
    country: contact.country || DEFAULT_COUNTRY,
    organization: contact.organization,
    organizationAddress: contact.organizationAddress ?? "",
    organizationCity: contact.organizationCity ?? "",
    organizationProvince: contact.organizationProvince ?? "",
    organizationRegion: contact.organizationRegion ?? "",
    organizationPostalCode: contact.organizationPostalCode ?? "",
    organizationCountry: contact.organizationCountry || DEFAULT_COUNTRY,
    organizationRole: contact.organizationRole ?? "",
    tags: formatTagsDisplay(contact.tags),
    dietaryNotes: contact.dietaryNotes ?? "",
    mobilityNotes: contact.mobilityNotes ?? "",
    personalRequests: contact.personalRequests ?? "",
    privacyConsents: normalizePrivacyConsents(
      contact.privacyConsents ?? defaultPrivacyConsents()
    ),
    notes: contact.notes,
    customConsentLabel: "",
  };
}

export function LeonardoContactSheetContent({
  tenantSlug,
  contact,
  onContactChange,
  assignments: assignmentsProp,
  onDelete,
  deleting = false,
  mode = "edit",
  onCreated,
  closeOnSuccess = false,
  onClose,
}: LeonardoContactSheetContentProps) {
  const isCreate = mode === "create";
  const [form, setForm] = useState(() => contactToForm(contact));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{
    updatedBy?: string;
    updatedAt?: string;
  } | null>(null);
  const [stale, setStale] = useState<{
    updatedBy?: string;
    updatedAt?: string;
  } | null>(null);
  const [assignments, setAssignments] = useState<ContactAssignmentWithEvent[]>(
    assignmentsProp ?? []
  );
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  useEntityRevisionWatch({
    enabled: !isCreate && Boolean(contact.id),
    fetchUrl: `/api/lean-event/contacts/${contact.id}`,
    localRevision: contact.revision ?? 1,
    extract: (payload) => {
      const contactPayload = (payload as { contact?: LeanEventContact }).contact;
      if (!contactPayload) {
        return null;
      }
      return {
        revision: contactPayload.revision ?? 1,
        updatedAt: contactPayload.updatedAt,
        updatedBy: contactPayload.updatedBy,
      };
    },
    onRemoteNewer: (info) => {
      setStale({ updatedBy: info.updatedBy, updatedAt: info.updatedAt });
    },
  });

  async function reloadContact() {
    const response = await fetch(`/api/lean-event/contacts/${contact.id}`, {
      credentials: "same-origin",
    });
    const payload = (await response.json()) as { contact?: LeanEventContact };
    if (payload.contact) {
      onContactChange(payload.contact);
      setStale(null);
      setConflict(null);
    }
  }

  useEffect(() => {
    if (isCreate) {
      return;
    }
    setForm(contactToForm(contact));
    setStale(null);
  }, [contact, isCreate]);

  useEffect(() => {
    if (assignmentsProp) {
      setAssignments(assignmentsProp);
    }
  }, [assignmentsProp]);

  useEffect(() => {
    if (isCreate || !contact.id) {
      return;
    }

    let cancelled = false;

    async function loadAssignments() {
      setAssignmentsLoading(true);
      try {
        const response = await fetch(
          `/api/lean-event/contacts/${contact.id}/assignments`,
          { credentials: "same-origin" }
        );
        const payload = (await response.json()) as {
          assignments?: ContactAssignmentWithEvent[];
        };
        if (!cancelled && response.ok && Array.isArray(payload.assignments)) {
          setAssignments(payload.assignments);
        }
      } catch {
        // lascia l'elenco già presente (props / stato precedente)
      } finally {
        if (!cancelled) {
          setAssignmentsLoading(false);
        }
      }
    }

    void loadAssignments();
    return () => {
      cancelled = true;
    };
  }, [contact.id, isCreate]);

  function setConsents(next: LeanEventContactPrivacyConsent[]) {
    setForm((current) => ({ ...current, privacyConsents: next }));
  }

  function updateEmail(index: number, patch: Partial<LeanEventContactEmail>) {
    setForm((current) => ({
      ...current,
      emails: current.emails.map((item, i) =>
        i === index ? { ...item, ...patch } : item
      ),
    }));
  }

  function updatePhone(index: number, patch: Partial<LeanEventContactPhone>) {
    setForm((current) => ({
      ...current,
      phones: current.phones.map((item, i) =>
        i === index ? { ...item, ...patch } : item
      ),
    }));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setSaving(false);
      setError("Nome e cognome obbligatori.");
      return;
    }

    const emails = form.emails
      .map((item) => ({
        label: item.label.trim() || "Principale",
        address: item.address.trim(),
      }))
      .filter((item) => item.address);

    if (emails.length === 0) {
      setSaving(false);
      setError("Almeno un indirizzo email è obbligatorio.");
      return;
    }

    const privacyConsents = normalizePrivacyConsents(form.privacyConsents);
    if (!hasBaseDataProcessingConsent(privacyConsents)) {
      setSaving(false);
      setError("Il consenso al trattamento dati è obbligatorio.");
      return;
    }

    const phones = form.phones
      .map((item) => ({
        label: item.label.trim() || "Principale",
        number: item.number.trim(),
      }))
      .filter((item) => item.number);

    const payload = {
      vocative: form.vocative,
      honorificTitle: form.honorificTitle,
      firstName: form.firstName,
      lastName: form.lastName,
      emails,
      email: primaryEmailFromList(emails),
      fiscalCode: form.fiscalCode,
      phones,
      birthDate: form.birthDate,
      address: form.address,
      city: form.city,
      province: form.province,
      region: form.region,
      postalCode: form.postalCode,
      country: form.country,
      organization: form.organization,
      organizationAddress: form.organizationAddress,
      organizationCity: form.organizationCity,
      organizationProvince: form.organizationProvince,
      organizationRegion: form.organizationRegion,
      organizationPostalCode: form.organizationPostalCode,
      organizationCountry: form.organizationCountry,
      organizationRole: form.organizationRole,
      tags: form.tags,
      dietaryNotes: form.dietaryNotes,
      mobilityNotes: form.mobilityNotes,
      personalRequests: form.personalRequests,
      privacyConsents,
      notes: form.notes,
    };

    const response = await fetch(
      isCreate
        ? "/api/lean-event/contacts"
        : `/api/lean-event/contacts/${contact.id}`,
      {
        method: isCreate ? "POST" : "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isCreate
            ? payload
            : { ...payload, expectedRevision: contact.revision ?? 1 }
        ),
      }
    );

    const result = (await response.json()) as {
      error?: string;
      duplicate?: boolean;
      contact?: LeanEventContact;
      updatedBy?: string;
      updatedAt?: string;
      currentRevision?: number;
    };

    setSaving(false);

    if (response.status === 409 && isRevisionConflictPayload(result)) {
      setConflict({
        updatedBy: result.updatedBy,
        updatedAt: result.updatedAt,
      });
      return;
    }

    if (response.status === 409 && result.contact) {
      setError(
        isCreate
          ? `Email già presente (${result.contact.firstName} ${result.contact.lastName}).`
          : (result.error ?? "Email già in uso.")
      );
      return;
    }

    if (!response.ok || !result.contact) {
      setError(result.error ?? "Salvataggio non riuscito.");
      return;
    }

    const saved = { ...result.contact, tags: result.contact.tags ?? [] };
    if (isCreate) {
      onCreated?.(saved);
      if (closeOnSuccess) {
        onClose?.();
        return;
      }
    }
    onContactChange(saved);
    setMessage(isCreate ? "Contatto creato." : "Contatto aggiornato.");
  }

  const inputClass =
    "w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia";

  const primarySummaryEmail =
    primaryEmailFromList(form.emails) || contact.email || "—";

  return (
    <div className="space-y-4">
      <LeonardoRevisionStaleBanner
        open={Boolean(stale)}
        updatedBy={stale?.updatedBy}
        updatedAt={stale?.updatedAt}
        onReload={() => {
          void reloadContact();
        }}
      />
      <LeonardoRevisionConflictDialog
        open={Boolean(conflict)}
        updatedBy={conflict?.updatedBy}
        updatedAt={conflict?.updatedAt}
        onReload={() => {
          void reloadContact();
        }}
        onDismiss={() => setConflict(null)}
      />
      {message ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {error}
        </p>
      ) : null}

      <LeonardoCollapsiblePanel
        title={isCreate ? "Nuovo contatto" : "Anagrafica"}
        summary={
          isCreate
            ? "Compila e salva una sola volta"
            : `${primarySummaryEmail} · ${contact.organization || "—"}`
        }
        defaultOpen
      >
        <form
          id={`contact-form-${contact.id || "new"}`}
          onSubmit={handleSave}
          className="space-y-6 pt-2"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <LeonardoCreatableSelect
              label="Vocativo"
              value={form.vocative}
              options={CONTACT_VOCATIVES}
              onChange={(vocative) => setForm({ ...form, vocative })}
              placeholder="Es. Egregio"
            />
            <LeonardoCreatableSelect
              label="Titolo"
              value={form.honorificTitle}
              options={CONTACT_TITLES}
              onChange={(honorificTitle) =>
                setForm({ ...form, honorificTitle })
              }
              placeholder="Es. Dottore, Prof."
            />
            <label className="block text-sm">
              <span className="mb-1 block text-white/60">Cognome *</span>
              <input
                required
                value={form.lastName}
                onChange={(event) =>
                  setForm({ ...form, lastName: event.target.value })
                }
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-white/60">Nome *</span>
              <input
                required
                value={form.firstName}
                onChange={(event) =>
                  setForm({ ...form, firstName: event.target.value })
                }
                className={inputClass}
              />
            </label>
          </div>

          <fieldset className="space-y-3 rounded-lg border border-white/10 p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-[0.1em] text-white/45">
              Email *
            </legend>
            <div className="space-y-3">
              {form.emails.map((email, index) => (
                <div
                  key={`email-${index}`}
                  className="grid gap-3 md:grid-cols-[minmax(0,8rem)_1fr_auto]"
                >
                  <label className="block text-sm">
                    <span className="mb-1 block text-white/60">Etichetta</span>
                    <input
                      value={email.label}
                      onChange={(event) =>
                        updateEmail(index, { label: event.target.value })
                      }
                      placeholder={index === 0 ? "Principale" : "Es. Lavoro"}
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-white/60">
                      Indirizzo{index === 0 ? " *" : ""}
                    </span>
                    <input
                      type="email"
                      required={index === 0}
                      value={email.address}
                      onChange={(event) =>
                        updateEmail(index, { address: event.target.value })
                      }
                      className={inputClass}
                    />
                  </label>
                  {form.emails.length > 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          emails: current.emails.filter((_, i) => i !== index),
                        }))
                      }
                      className="self-end rounded-md border border-white/20 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/70 transition hover:border-white hover:text-white"
                    >
                      Rimuovi
                    </button>
                  ) : (
                    <span className="hidden md:block" />
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  emails: [
                    ...current.emails,
                    { label: "Secondaria", address: "" },
                  ],
                }))
              }
              className="rounded-md border border-white/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/75 transition hover:border-white hover:text-white"
            >
              Aggiungi email
            </button>
          </fieldset>

          <fieldset className="space-y-3 rounded-lg border border-white/10 p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-[0.1em] text-white/45">
              Telefoni
            </legend>
            <div className="space-y-3">
              {form.phones.map((phone, index) => (
                <div
                  key={`phone-${index}`}
                  className="grid gap-3 md:grid-cols-[minmax(0,8rem)_1fr_auto]"
                >
                  <label className="block text-sm">
                    <span className="mb-1 block text-white/60">Etichetta</span>
                    <input
                      value={phone.label}
                      onChange={(event) =>
                        updatePhone(index, { label: event.target.value })
                      }
                      placeholder={index === 0 ? "Principale" : "Secondario"}
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-white/60">Numero</span>
                    <input
                      value={phone.number}
                      onChange={(event) =>
                        updatePhone(index, { number: event.target.value })
                      }
                      className={inputClass}
                    />
                  </label>
                  {form.phones.length > 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          phones:
                            current.phones.length > 1
                              ? current.phones.filter((_, i) => i !== index)
                              : [emptyPhone()],
                        }))
                      }
                      className="self-end rounded-md border border-white/20 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/70 transition hover:border-white hover:text-white"
                    >
                      Rimuovi
                    </button>
                  ) : (
                    <span className="hidden md:block" />
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  phones: [
                    ...current.phones,
                    { label: "Secondario", number: "" },
                  ],
                }))
              }
              className="rounded-md border border-white/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/75 transition hover:border-white hover:text-white"
            >
              Aggiungi telefono
            </button>
          </fieldset>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-white/60">Codice fiscale</span>
              <input
                value={form.fiscalCode}
                onChange={(event) =>
                  setForm({ ...form, fiscalCode: event.target.value })
                }
                className={`${inputClass} uppercase`}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-white/60">Data di nascita</span>
              <LeonardoDateInput
                value={form.birthDate}
                onChange={(birthDate) => setForm({ ...form, birthDate })}
                className={inputClass}
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block text-white/60">
                Categorie / tag (separati da virgola)
              </span>
              <input
                value={form.tags}
                onChange={(event) =>
                  setForm({ ...form, tags: event.target.value })
                }
                placeholder="docente, sponsor, BO"
                className={inputClass}
              />
            </label>
          </div>

          <fieldset className="space-y-3 rounded-lg border border-white/10 p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-[0.1em] text-white/45">
              Residenza
            </legend>
            <LeonardoAddressFields
              value={{
                address: form.address,
                city: form.city,
                province: form.province,
                region: form.region,
                postalCode: form.postalCode,
                country: form.country,
              }}
              onChange={(address) =>
                setForm({
                  ...form,
                  address: address.address,
                  city: address.city,
                  province: address.province,
                  region: address.region,
                  postalCode: address.postalCode,
                  country: address.country,
                })
              }
            />
          </fieldset>

          <fieldset className="space-y-3 rounded-lg border border-white/10 p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-[0.1em] text-white/45">
              Ente / lavoro
            </legend>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-white/60">Nome ente</span>
                <input
                  value={form.organization}
                  onChange={(event) =>
                    setForm({ ...form, organization: event.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <LeonardoAddressFields
                labelPrefix="ente"
                value={{
                  address: form.organizationAddress,
                  city: form.organizationCity,
                  province: form.organizationProvince,
                  region: form.organizationRegion,
                  postalCode: form.organizationPostalCode,
                  country: form.organizationCountry,
                }}
                onChange={(address) =>
                  setForm({
                    ...form,
                    organizationAddress: address.address,
                    organizationCity: address.city,
                    organizationProvince: address.province,
                    organizationRegion: address.region,
                    organizationPostalCode: address.postalCode,
                    organizationCountry: address.country,
                  })
                }
              />
              <LeonardoCreatableSelect
                label="Ruolo aziendale"
                value={form.organizationRole}
                options={CONTACT_ORGANIZATION_ROLES}
                onChange={(organizationRole) =>
                  setForm({ ...form, organizationRole })
                }
                placeholder="Es. Dirigente"
              />
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-lg border border-white/10 p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-[0.1em] text-white/45">
              Informazioni supplementari
            </legend>
            <label className="block text-sm">
              <span className="mb-1 block text-white/60">
                Preferenze alimentari / intolleranze
              </span>
              <textarea
                value={form.dietaryNotes}
                onChange={(event) =>
                  setForm({ ...form, dietaryNotes: event.target.value })
                }
                rows={2}
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-white/60">
                Mobilità ridotta / accessibilità
              </span>
              <textarea
                value={form.mobilityNotes}
                onChange={(event) =>
                  setForm({ ...form, mobilityNotes: event.target.value })
                }
                rows={2}
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-white/60">
                Altre richieste personali
              </span>
              <textarea
                value={form.personalRequests}
                onChange={(event) =>
                  setForm({ ...form, personalRequests: event.target.value })
                }
                rows={2}
                className={inputClass}
              />
            </label>
          </fieldset>

          <fieldset className="space-y-3 rounded-lg border border-white/10 p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-[0.1em] text-white/45">
              Privacy e consensi
            </legend>
            <ul className="space-y-2">
              {form.privacyConsents.map((consent) => {
                const isBase = consent.id === "data_processing";
                return (
                  <li key={consent.id}>
                    <label
                      className={`flex items-start gap-2 text-sm text-white/75 ${
                        isBase ? "cursor-default" : "cursor-pointer"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={consent.granted}
                        disabled={isBase}
                        onChange={(event) => {
                          if (isBase) {
                            return;
                          }
                          setConsents(
                            togglePrivacyConsent(
                              form.privacyConsents,
                              consent.id,
                              event.target.checked
                            )
                          );
                        }}
                        className="mt-1 accent-leanme-fuchsia disabled:opacity-80"
                      />
                      <span>
                        {consent.label}
                        {isBase ? (
                          <span className="mt-0.5 block text-xs text-white/40">
                            Obbligatorio e preflaggato per caricamento in
                            piattaforma
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            {form.privacyConsents.filter(
              (consent) =>
                ![
                  "data_processing",
                  "newsletter",
                  "marketing",
                  "third_party",
                ].includes(consent.id)
            ).length < 2 ? (
              <div className="flex flex-wrap gap-2">
                <input
                  value={form.customConsentLabel}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      customConsentLabel: event.target.value,
                    })
                  }
                  placeholder="Altro consenso (etichetta)"
                  className={`min-w-[12rem] flex-1 ${inputClass}`}
                />
                <button
                  type="button"
                  onClick={() => {
                    const label = form.customConsentLabel;
                    setForm((current) => ({
                      ...current,
                      privacyConsents: addCustomPrivacyConsent(
                        current.privacyConsents,
                        label
                      ),
                      customConsentLabel: "",
                    }));
                  }}
                  className="rounded-md border border-white/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/75 transition hover:border-white hover:text-white"
                >
                  Aggiungi consenso
                </button>
              </div>
            ) : (
              <p className="text-xs text-white/40">
                Massimo 2 consensi personalizzati.
              </p>
            )}
          </fieldset>

          <label className="block text-sm">
            <span className="mb-1 block text-white/60">Note</span>
            <textarea
              value={form.notes}
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value })
              }
              rows={3}
              className={inputClass}
            />
          </label>
        </form>
      </LeonardoCollapsiblePanel>

      {!isCreate ? (
        <LeonardoCollapsiblePanel
          title="Eventi collegati"
          summary={
            assignmentsLoading
              ? "Caricamento…"
              : `${assignments.length} eventi`
          }
          defaultOpen={assignments.length > 0}
        >
          <div className="space-y-2 pt-2">
            <LeonardoContactLinkedEvents
              tenantSlug={tenantSlug}
              assignments={assignments}
              loading={assignmentsLoading}
              footer={
                <Link
                  href={leanEventLeonardoContactPath(tenantSlug, contact.id)}
                  className="inline-block text-xs font-semibold uppercase tracking-[0.08em] text-white/45 hover:text-leanme-fuchsia"
                >
                  Scheda completa →
                </Link>
              }
            />
          </div>
        </LeonardoCollapsiblePanel>
      ) : null}

      {!isCreate && contact.id ? (
        <LeonardoEntityVersionsPanel
          entityType="contact"
          entityId={contact.id}
          currentRevision={contact.revision}
          onRestored={(entity) => {
            onContactChange(entity as LeanEventContact);
          }}
        />
      ) : null}

      <div className="flex flex-wrap gap-3 border-t border-white/10 pt-4">
        <button
          type="submit"
          form={`contact-form-${contact.id || "new"}`}
          disabled={saving || deleting}
          className="rounded-full bg-leanme-fuchsia px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark disabled:opacity-60"
        >
          {saving
            ? "Salvataggio…"
            : isCreate
              ? "Crea contatto"
              : "Salva contatto"}
        </button>
        {isCreate ? (
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full border border-white/20 px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white/70 transition hover:border-leanme-fuchsia"
          >
            Annulla
          </button>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting || saving}
            className="rounded-full border border-red-500/40 px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-red-200 transition hover:bg-red-500/10 disabled:opacity-60"
          >
            {deleting ? "Eliminazione…" : "Elimina"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
