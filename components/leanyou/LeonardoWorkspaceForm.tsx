"use client";

import { useState } from "react";

import { leanyouLeonardoWorkspacePath } from "@/lib/leanyou/paths";
import { todayEuropeanDate } from "@/lib/leanyou/dates";
import type { LeonardoMeetingType } from "@/types/leanyou";

const meetingTypes: Array<{ value: LeonardoMeetingType; label: string }> = [
  { value: "client_meeting", label: "Riunione cliente" },
  { value: "scientific_committee", label: "Comitato scientifico" },
  { value: "internal_meeting", label: "Riunione interna" },
];

export function LeonardoWorkspaceForm({
  tenantSlug,
  linkedEventId,
}: {
  tenantSlug: string;
  linkedEventId?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const tags = String(formData.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const response = await fetch("/api/leanyou/workspaces", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title"),
        client: formData.get("client"),
        organization: formData.get("organization"),
        meetingDate: formData.get("meetingDate"),
        meetingType: formData.get("meetingType"),
        participants: formData.get("participants"),
        moderator: formData.get("moderator"),
        secretary: formData.get("secretary"),
        notes: formData.get("notes"),
        tags,
        linkedEventId: linkedEventId?.trim() || null,
      }),
    });

    const payload = (await response.json()) as {
      error?: string;
      workspace?: { id: string };
    };
    setLoading(false);

    if (!response.ok || !payload.workspace) {
      setError(payload.error ?? "Creazione non riuscita.");
      return;
    }

    window.location.assign(
      leanyouLeonardoWorkspacePath(tenantSlug, payload.workspace.id)
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div className="space-y-4 rounded-xl border border-white/10 bg-[#111111] p-6">
        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-leanme-fuchsia">
          Scheda registrazione
        </h2>

        {(
          [
            ["title", "Titolo", "text", true],
            ["client", "Cliente", "text", true],
            ["organization", "Organizzazione", "text", false],
            ["meetingDate", "Data riunione (gg/mm/aaaa)", "text", true],
            ["participants", "Partecipanti", "text", false],
            ["moderator", "Moderatore", "text", false],
            ["secretary", "Segretario", "text", false],
            ["tags", "Tag (separati da virgola)", "text", false],
          ] as const
        ).map(([id, label, type, required]) => (
          <div key={id}>
            <label
              htmlFor={id}
              className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55"
            >
              {label}
            </label>
            <input
              id={id}
              name={id}
              type={type}
              required={required}
              defaultValue={
                id === "meetingDate" ? todayEuropeanDate() : undefined
              }
              placeholder={id === "meetingDate" ? "gg/mm/aaaa" : undefined}
              pattern={
                id === "meetingDate"
                  ? "\\d{2}/\\d{2}/\\d{4}"
                  : undefined
              }
              className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </div>
        ))}

        <div>
          <label
            htmlFor="meetingType"
            className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55"
          >
            Tipo riunione
          </label>
          <select
            id="meetingType"
            name="meetingType"
            defaultValue="client_meeting"
            className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
          >
            {meetingTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="notes"
            className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55"
          >
            Note
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
          />
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-leanme-fuchsia px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark disabled:opacity-60"
      >
        {loading ? "Creazione..." : "Crea workspace"}
      </button>
    </form>
  );
}
