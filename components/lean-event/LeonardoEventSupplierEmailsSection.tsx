"use client";

import { useMemo, useState } from "react";

import { LeonardoDateTimeInput } from "@/components/lean-event/LeonardoDateTimeInput";
import type { LeonardoSupplierEmailRecord } from "@/types/lean-event";
import type { EventSupplierWithSupplier } from "@/lib/lean-event/event-suppliers";

interface LeonardoEventSupplierEmailsSectionProps {
  eventId: string;
  link: EventSupplierWithSupplier;
  onUpdated: (emails: LeonardoSupplierEmailRecord[]) => void;
  embedded?: boolean;
}

export function LeonardoEventSupplierEmailsSection({
  eventId,
  link,
  onUpdated,
  embedded = false,
}: LeonardoEventSupplierEmailsSectionProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    subject: "",
    occurredAt: "",
    direction: "outbound" as "inbound" | "outbound",
    fromEmail: "",
    toEmail: "",
    summary: "",
  });

  const emails = useMemo(
    () =>
      [...(link.emails ?? [])].sort((a, b) =>
        b.occurredAt.localeCompare(a.occurredAt)
      ),
    [link.emails]
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch(
      `/api/lean-event/events/${eventId}/suppliers/${link.id}/emails`,
      {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }
    );

    const payload = (await response.json()) as {
      error?: string;
      link?: EventSupplierWithSupplier;
    };

    setSaving(false);

    if (!response.ok || !payload.link) {
      setError(payload.error ?? "Registrazione email non riuscita.");
      return;
    }

    onUpdated(payload.link.emails ?? []);
    setForm({
      subject: "",
      occurredAt: "",
      direction: "outbound",
      fromEmail: "",
      toEmail: "",
      summary: "",
    });
  }

  const inner = (
    <>
      {error ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {error}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block text-white/60">Oggetto *</span>
          <input
            required
            value={form.subject}
            onChange={(event) => setForm({ ...form, subject: event.target.value })}
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-white/60">Data/ora</span>
          <LeonardoDateTimeInput
            value={form.occurredAt}
            onChange={(occurredAt) => setForm({ ...form, occurredAt })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-white/60">Direzione</span>
          <select
            value={form.direction}
            onChange={(event) =>
              setForm({
                ...form,
                direction: event.target.value as "inbound" | "outbound",
              })
            }
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
          >
            <option value="outbound">Inviata</option>
            <option value="inbound">Ricevuta</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-white/60">Da</span>
          <input
            type="email"
            value={form.fromEmail}
            onChange={(event) => setForm({ ...form, fromEmail: event.target.value })}
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-white/60">A</span>
          <input
            type="email"
            value={form.toEmail}
            onChange={(event) => setForm({ ...form, toEmail: event.target.value })}
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
          />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block text-white/60">Sintesi / note</span>
          <textarea
            rows={2}
            value={form.summary}
            onChange={(event) => setForm({ ...form, summary: event.target.value })}
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
          />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full border border-white/20 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:border-leanme-fuchsia disabled:opacity-60"
          >
            {saving ? "Salvataggio…" : "Registra email"}
          </button>
        </div>
      </form>

      {emails.length === 0 ? (
        <p className="text-sm text-white/45">Nessuna email registrata.</p>
      ) : (
        <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
          {emails.map((email) => (
            <li key={email.id} className="px-4 py-3">
              <p className="font-medium text-white">{email.subject}</p>
              <p className="mt-1 text-xs text-white/50">
                {email.direction === "inbound" ? "Ricevuta" : "Inviata"} ·{" "}
                {email.occurredAt}
              </p>
              {email.summary ? (
                <p className="mt-1 text-sm text-white/60">{email.summary}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );

  if (embedded) {
    return <div className="space-y-4 pt-2">{inner}</div>;
  }

  return (
    <section className="space-y-4 rounded-xl border border-white/10 bg-[#0d0d0d] p-5">
      {inner}
    </section>
  );
}
