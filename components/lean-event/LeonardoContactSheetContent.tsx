"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { LeonardoCollapsiblePanel } from "@/components/lean-event/LeonardoCollapsiblePanel";
import { formatTagsDisplay } from "@/lib/lean-event/contact-tags";
import {
  leanEventLeonardoContactPath,
  leanEventLeonardoEventPath,
} from "@/lib/lean-event/paths";
import type { ContactAssignmentWithEvent } from "@/lib/lean-event/event-assignments";
import type { LeanEventContact } from "@/types/lean-event";

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

export function LeonardoContactSheetContent({
  tenantSlug,
  contact,
  onContactChange,
  assignments = [],
  onDelete,
  deleting = false,
  mode = "edit",
  onCreated,
  closeOnSuccess = false,
  onClose,
}: LeonardoContactSheetContentProps) {
  const isCreate = mode === "create";
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
    if (isCreate) {
      return;
    }
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
  }, [contact, isCreate]);

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

    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      fiscalCode: form.fiscalCode,
      phones,
      organization: form.organization,
      tags: form.tags,
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
    };

    setSaving(false);

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
        title={isCreate ? "Nuovo contatto" : "Anagrafica"}
        summary={
          isCreate
            ? "Compila e salva una sola volta"
            : `${contact.email || "—"} · ${contact.organization || "—"}`
        }
        defaultOpen
      >
        <form
          id={`contact-form-${contact.id || "new"}`}
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

      {!isCreate ? (
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
                  href={leanEventLeonardoEventPath(tenantSlug, assignment.eventId)}
                  className="font-medium text-leanme-fuchsia hover:underline"
                >
                  {assignment.eventTitle}
                </Link>
                <p className="text-xs text-white/50">{assignment.roleLabel}</p>
              </div>
            ))
          )}
          <Link
            href={leanEventLeonardoContactPath(tenantSlug, contact.id)}
            className="inline-block text-xs font-semibold uppercase tracking-[0.08em] text-white/45 hover:text-leanme-fuchsia"
          >
            Scheda completa →
          </Link>
        </div>
      </LeonardoCollapsiblePanel>
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
