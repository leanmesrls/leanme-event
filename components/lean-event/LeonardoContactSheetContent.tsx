"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { LeonardoCollapsiblePanel } from "@/components/lean-event/LeonardoCollapsiblePanel";
import { LeonardoContactLinkedEvents } from "@/components/lean-event/LeonardoContactLinkedEvents";
import { LeonardoEntityVersionsPanel } from "@/components/lean-event/LeonardoEntityVersionsPanel";
import { LeonardoRevisionConflictDialog } from "@/components/lean-event/LeonardoRevisionConflictDialog";
import { LeonardoRevisionStaleBanner } from "@/components/lean-event/LeonardoRevisionStaleBanner";
import { formatTagsDisplay } from "@/lib/lean-event/contact-tags";
import {
  leanEventLeonardoContactPath,
} from "@/lib/lean-event/paths";
import { isRevisionConflictPayload } from "@/lib/lean-event/revision-conflict";
import { useEntityRevisionWatch } from "@/lib/lean-event/use-entity-revision-watch";
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
  assignments: assignmentsProp,
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
    organizationProvince: contact.organizationProvince ?? "",
    tags: formatTagsDisplay(contact.tags),
    notes: contact.notes,
  });
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
      organizationProvince: contact.organizationProvince ?? "",
      tags: formatTagsDisplay(contact.tags),
      notes: contact.notes,
    });
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
      organizationProvince: form.organizationProvince,
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
              rows={3}
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
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
