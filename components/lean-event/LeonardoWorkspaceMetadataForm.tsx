"use client";

import { useState } from "react";

import { formatEuropeanDate } from "@/lib/lean-event/dates";
import type { LeonardoEvent, LeonardoMeetingType, LeonardoWorkspace } from "@/types/lean-event";

const meetingTypes: Array<{ value: LeonardoMeetingType; label: string }> = [
  { value: "client_meeting", label: "Riunione cliente" },
  { value: "scientific_committee", label: "Comitato scientifico" },
  { value: "internal_meeting", label: "Riunione interna" },
];

interface LeonardoWorkspaceMetadataFormProps {
  workspace: LeonardoWorkspace;
  events?: LeonardoEvent[];
  onUpdated: (workspace: LeonardoWorkspace) => void;
}

export function LeonardoWorkspaceMetadataForm({
  workspace,
  events = [],
  onUpdated,
}: LeonardoWorkspaceMetadataFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: workspace.title,
    client: workspace.client,
    organization: workspace.organization,
    meetingDate: formatEuropeanDate(workspace.meetingDate),
    meetingType: workspace.meetingType,
    participants: workspace.participants,
    moderator: workspace.moderator,
    secretary: workspace.secretary,
    notes: workspace.notes,
    tags: workspace.tags.join(", "),
    linkedEventId: workspace.linkedEventId ?? "",
  });

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/lean-event/workspaces/${workspace.id}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        client: form.client,
        organization: form.organization,
        meetingDate: form.meetingDate,
        meetingType: form.meetingType,
        participants: form.participants,
        moderator: form.moderator,
        secretary: form.secretary,
        notes: form.notes,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        linkedEventId: form.linkedEventId.trim() || null,
        expectedRevision: workspace.revision ?? 1,
      }),
    });

    const payload = (await response.json()) as {
      error?: string;
      workspace?: LeonardoWorkspace;
    };
    setLoading(false);

    if (!response.ok || !payload.workspace) {
      setError(payload.error ?? "Salvataggio non riuscito.");
      return;
    }

    onUpdated(payload.workspace);
    setOpen(false);
  }

  return (
    <section className="rounded-xl border border-white/10 bg-[#111111] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-leanme-fuchsia">
            Scheda registrazione
          </h3>
          <p className="mt-1 text-sm text-white/60">
            Modifica anagrafica, partecipanti e tag del workspace.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:border-white"
        >
          {open ? "Chiudi" : "Modifica scheda"}
        </button>
      </div>

      {open ? (
        <form onSubmit={handleSave} className="mt-5 grid gap-4 md:grid-cols-2">
          {(
            [
              ["title", "Titolo"],
              ["client", "Cliente"],
              ["organization", "Organizzazione"],
              ["meetingDate", "Data riunione (gg/mm/aaaa)"],
              ["participants", "Partecipanti"],
              ["moderator", "Moderatore"],
              ["secretary", "Segretario"],
              ["tags", "Tag (separati da virgola)"],
            ] as const
          ).map(([field, label]) => (
            <label key={field} className={field === "tags" ? "md:col-span-2" : ""}>
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
                {label}
              </span>
              <input
                type="text"
                value={form[field]}
                onChange={(event) => updateField(field, event.target.value)}
                placeholder={field === "meetingDate" ? "gg/mm/aaaa" : undefined}
                pattern={
                  field === "meetingDate" ? "\\d{2}/\\d{2}/\\d{4}" : undefined
                }
                required={field === "title" || field === "client" || field === "meetingDate"}
                className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
              />
            </label>
          ))}

          <label>
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
              Tipo riunione
            </span>
            <select
              value={form.meetingType}
              onChange={(event) =>
                updateField("meetingType", event.target.value)
              }
              className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
            >
              {meetingTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          {events.length > 0 ? (
            <label>
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
                Evento collegato
              </span>
              <select
                value={form.linkedEventId}
                onChange={(event) =>
                  updateField("linkedEventId", event.target.value)
                }
                className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
              >
                <option value="">Nessun evento</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.cdc ? `${event.cdc} · ` : ""}
                    {event.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
              Note
            </span>
            <textarea
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>

          {error ? (
            <p className="md:col-span-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-leanme-fuchsia px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark disabled:opacity-60"
            >
              {loading ? "Salvataggio..." : "Salva scheda"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
