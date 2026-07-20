"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { LeonardoContactLinkedEvents } from "@/components/lean-event/LeonardoContactLinkedEvents";
import { formatTagsDisplay } from "@/lib/lean-event/contact-tags";
import { formatContactName } from "@/lib/lean-event/contact-display";
import { leanEventLeonardoContattiPath } from "@/lib/lean-event/paths";
import type { ContactAssignmentWithEvent } from "@/lib/lean-event/event-assignments";
import type { LeanEventContact } from "@/types/lean-event";

interface LeonardoContactDetailProps {
  tenantSlug: string;
  initialContact: LeanEventContact;
  assignments: ContactAssignmentWithEvent[];
}

export function LeonardoContactDetail({
  tenantSlug,
  initialContact,
  assignments,
}: LeonardoContactDetailProps) {
  const router = useRouter();
  const [contact, setContact] = useState({
    ...initialContact,
    tags: initialContact.tags ?? [],
  });
  const [form, setForm] = useState({
    firstName: initialContact.firstName,
    lastName: initialContact.lastName,
    email: initialContact.email,
    fiscalCode: initialContact.fiscalCode ?? "",
    phone: initialContact.phones[0]?.number ?? "",
    phoneLabel: initialContact.phones[0]?.label ?? "Principale",
    phone2: initialContact.phones[1]?.number ?? "",
    phone2Label: initialContact.phones[1]?.label ?? "Secondario",
    organization: initialContact.organization,
    organizationProvince: initialContact.organizationProvince ?? "",
    tags: formatTagsDisplay(initialContact.tags),
    notes: initialContact.notes,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

    const response = await fetch(`/api/lean-event/contacts/${contact.id}`, {
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
        organizationProvince: form.organizationProvince,
        tags: form.tags,
        notes: form.notes,
      }),
    });

    const payload = (await response.json()) as {
      error?: string;
      contact?: LeanEventContact;
    };

    setSaving(false);

    if (!response.ok || !payload.contact) {
      setError(payload.error ?? "Salvataggio non riuscito.");
      return;
    }

    setContact({ ...payload.contact, tags: payload.contact.tags ?? [] });
    setMessage("Contatto aggiornato.");
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Eliminare ${formatContactName(contact)} dalla rubrica? L'operazione non rimuove i collegamenti già creati negli eventi.`
      )
    ) {
      return;
    }

    setDeleting(true);
    setError(null);

    const response = await fetch(`/api/lean-event/contacts/${contact.id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });

    setDeleting(false);

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Eliminazione non riuscita.");
      return;
    }

    router.push(leanEventLeonardoContattiPath(tenantSlug));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={leanEventLeonardoContattiPath(tenantSlug)}
          className="text-xs font-semibold uppercase tracking-[0.1em] text-leanme-fuchsia"
        >
          ← Torna alla rubrica
        </Link>
        <h2 className="mt-3 text-2xl font-bold">{formatContactName(contact)}</h2>
        <p className="mt-1 text-sm text-white/60">
          Scheda anagrafica contatto · aggiornato{" "}
          {new Date(contact.updatedAt).toLocaleDateString("it-IT")}
        </p>
      </div>

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

      <form
        onSubmit={handleSave}
        className="space-y-4 rounded-xl border border-white/10 bg-[#111111] p-6"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/45">
          Anagrafica
        </p>

        <div className="grid gap-3 md:grid-cols-2">
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
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">Prov. ente / azienda</span>
            <input
              value={form.organizationProvince}
              onChange={(event) =>
                setForm({
                  ...form,
                  organizationProvince: event.target.value.toUpperCase(),
                })
              }
              maxLength={2}
              placeholder="BO"
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm uppercase outline-none focus:border-leanme-fuchsia"
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
              rows={4}
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || deleting}
            className="rounded-full bg-leanme-fuchsia px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark disabled:opacity-60"
          >
            {saving ? "Salvataggio…" : "Salva modifiche"}
          </button>
          <button
            type="button"
            disabled={saving || deleting}
            onClick={handleDelete}
            className="rounded-full border border-red-500/40 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-red-200 transition hover:border-red-400 disabled:opacity-60"
          >
            {deleting ? "Eliminazione…" : "Elimina contatto"}
          </button>
        </div>
      </form>

      <section className="rounded-xl border border-white/10 bg-[#111111] p-6">
        <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-white/45">
          Eventi collegati
        </h3>
        <div className="mt-3">
          <LeonardoContactLinkedEvents
            tenantSlug={tenantSlug}
            assignments={assignments}
          />
        </div>
      </section>
    </div>
  );
}
