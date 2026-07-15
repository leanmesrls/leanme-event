"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { LeonardoCollapsiblePanel } from "@/components/leanyou/LeonardoCollapsiblePanel";
import { formatTagsDisplay } from "@/lib/leanyou/contact-tags";
import {
  leanyouLeonardoContactPath,
  leanyouLeonardoEventPath,
} from "@/lib/leanyou/paths";
import type { ContactAssignmentWithEvent } from "@/lib/leanyou/event-assignments";
import type { LeanYouContact } from "@/types/leanyou";

interface LeonardoContactSheetContentProps {
  tenantSlug: string;
  contact: LeanYouContact;
  onContactChange: (contact: LeanYouContact) => void;
  assignments?: ContactAssignmentWithEvent[];
  onDelete?: () => void;
  deleting?: boolean;
}

export function LeonardoContactSheetContent({
  tenantSlug,
  contact,
  onContactChange,
  assignments = [],
  onDelete,
  deleting = false,
}: LeonardoContactSheetContentProps) {
  const [form, setForm] = useState({
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    fiscalCode: contact.fiscalCode ?? "",
    phone: contact.phones[0]?.number ?? "",
    phoneLabel: contact.phones[0]?.label ?? "Principale",
    phone2: contact.phones[1]?.number ?? "",
    phone2Label: contact.phones[1]?.label ?? "Secondario",
    organization: contact.organization,
    tags: formatTagsDisplay(contact.tags),
    notes: contact.notes,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      fiscalCode: contact.fiscalCode ?? "",
      phone: contact.phones[0]?.number ?? "",
      phoneLabel: contact.phones[0]?.label ?? "Principale",
      phone2: contact.phones[1]?.number ?? "",
      phone2Label: contact.phones[1]?.label ?? "Secondario",
      organization: contact.organization,
      tags: formatTagsDisplay(contact.tags),
      notes: contact.notes,
    });
  }, [contact]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const phones = [];
    if (form.phone.trim()) {
      phones.push({
        label: form.phoneLabel.trim() || "Principale",
        number: form.phone.trim(),
      });
    }
    if (form.phone2.trim()) {
      phones.push({
        label: form.phone2Label.trim() || "Secondario",
        number: form.phone2.trim(),
      });
    }

    const response = await fetch(`/api/leanyou/contacts/${contact.id}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        fiscalCode: form.fiscalCode,
        phones,
        organization: form.organization,
        tags: form.tags,
        notes: form.notes,
        expectedRevision: contact.revision ?? 1,
      }),
    });

    const payload = (await response.json()) as {
      error?: string;
      contact?: LeanYouContact;
    };

    setSaving(false);

    if (!response.ok || !payload.contact) {
      setError(payload.error ?? "Salvataggio non riuscito.");
      return;
    }

    onContactChange({ ...payload.contact, tags: payload.contact.tags ?? [] });
    setMessage("Contatto aggiornato.");
  }

  return (
    <div className="space-y-4">
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
        title="Anagrafica"
        summary={`${contact.email || "—"} · ${contact.organization || "—"}`}
        defaultOpen
      >
        <form
          id={`contact-form-${contact.id}`}
          onSubmit={handleSave}
          className="grid gap-3 pt-2 md:grid-cols-2"
        >
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">Nome *</span>
            <input
              required
              value={form.firstName}
              onChange={(event) => setForm({ ...form, firstName: event.target.value })}
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">Cognome *</span>
            <input
              required
              value={form.lastName}
              onChange={(event) => setForm({ ...form, lastName: event.target.value })}
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">Codice fiscale</span>
            <input
              value={form.fiscalCode}
              onChange={(event) => setForm({ ...form, fiscalCode: event.target.value })}
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm uppercase outline-none focus:border-leanme-fuchsia"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">Telefono</span>
            <input
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">Telefono 2</span>
            <input
              value={form.phone2}
              onChange={(event) => setForm({ ...form, phone2: event.target.value })}
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block text-white/60">Organizzazione</span>
            <input
              value={form.organization}
              onChange={(event) =>
                setForm({ ...form, organization: event.target.value })
              }
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block text-white/60">Tag (separati da virgola)</span>
            <input
              value={form.tags}
              onChange={(event) => setForm({ ...form, tags: event.target.value })}
              placeholder="docente, sponsor, BO"
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block text-white/60">Note</span>
            <textarea
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              rows={3}
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
        </form>
      </LeonardoCollapsiblePanel>

      <LeonardoCollapsiblePanel
        title="Eventi collegati"
        summary={`${assignments.length} eventi`}
        defaultOpen={assignments.length > 0}
      >
        <div className="space-y-2 pt-2">
          {assignments.length === 0 ? (
            <p className="text-sm text-white/50">
              Nessun ruolo su eventi. Collega il contatto dal tab Ospiti.
            </p>
          ) : (
            assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm"
              >
                <Link
                  href={leanyouLeonardoEventPath(tenantSlug, assignment.eventId)}
                  className="font-medium text-leanme-fuchsia hover:underline"
                >
                  {assignment.eventTitle}
                </Link>
                <p className="text-xs text-white/50">{assignment.roleLabel}</p>
              </div>
            ))
          )}
          <Link
            href={leanyouLeonardoContactPath(tenantSlug, contact.id)}
            className="inline-block text-xs font-semibold uppercase tracking-[0.08em] text-white/45 hover:text-leanme-fuchsia"
          >
            Scheda completa →
          </Link>
        </div>
      </LeonardoCollapsiblePanel>

      <div className="flex flex-wrap gap-3 border-t border-white/10 pt-4">
        <button
          type="submit"
          form={`contact-form-${contact.id}`}
          disabled={saving || deleting}
          className="rounded-full bg-leanme-fuchsia px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark disabled:opacity-60"
        >
          {saving ? "Salvataggio…" : "Salva contatto"}
        </button>
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
