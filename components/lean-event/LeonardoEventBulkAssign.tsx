"use client";

import { useMemo, useState } from "react";

import eventsConfig from "@/data/lean-event/events-config.json";
import { collectContactOrganizations, collectContactTags } from "@/lib/lean-event/contact-tags";
import type { EventAssignmentWithContact } from "@/lib/lean-event/event-assignments";
import type {
  LeanEventContact,
  LeonardoEvent,
  LeonardoEventRoleCategory,
} from "@/types/lean-event";

const roleCategories = eventsConfig.roleCategories as Array<{
  id: LeonardoEventRoleCategory;
  label: string;
}>;

type SourceType = "tags" | "organization" | "past_event";

interface BulkPreview {
  matched: number;
  alreadyAssigned: number;
  toAdd: number;
  sampleNames: string[];
}

interface LeonardoEventBulkAssignProps {
  eventId: string;
  contacts: LeanEventContact[];
  otherEvents: LeonardoEvent[];
  onAssigned: (assignments: EventAssignmentWithContact[]) => void;
  embedded?: boolean;
}

export function LeonardoEventBulkAssign({
  eventId,
  contacts,
  otherEvents,
  onAssigned,
  embedded = false,
}: LeonardoEventBulkAssignProps) {
  const [open, setOpen] = useState(embedded);
  const [sourceType, setSourceType] = useState<SourceType>("tags");
  const [roleCategory, setRoleCategory] =
    useState<LeonardoEventRoleCategory>("ospite");
  const [tagMatch, setTagMatch] = useState<"any" | "all">("any");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [organization, setOrganization] = useState("");
  const [sourceEventId, setSourceEventId] = useState("");
  const [sourceRoleCategory, setSourceRoleCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<BulkPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const availableTags = useMemo(() => collectContactTags(contacts), [contacts]);
  const availableOrganizations = useMemo(
    () => collectContactOrganizations(contacts),
    [contacts]
  );

  function buildSource() {
    if (sourceType === "tags") {
      return {
        type: "tags" as const,
        tags: selectedTags,
        match: tagMatch,
      };
    }
    if (sourceType === "organization") {
      return {
        type: "organization" as const,
        organization,
      };
    }
    return {
      type: "past_event" as const,
      sourceEventId,
      ...(sourceRoleCategory
        ? { sourceRoleCategory: sourceRoleCategory as LeonardoEventRoleCategory }
        : {}),
    };
  }

  function toggleTag(tag: string) {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag]
    );
    setPreview(null);
  }

  async function handlePreview() {
    setError(null);
    setPending(true);

    const response = await fetch(
      `/api/lean-event/events/${eventId}/assignments/bulk`,
      {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preview: true,
          roleCategory,
          source: buildSource(),
        }),
      }
    );

    const payload = (await response.json()) as {
      error?: string;
      preview?: BulkPreview;
    };
    setPending(false);

    if (!response.ok || !payload.preview) {
      setError(payload.error ?? "Anteprima non riuscita.");
      setPreview(null);
      return;
    }

    setPreview(payload.preview);
  }

  async function handleApply() {
    setError(null);
    setPending(true);

    const response = await fetch(
      `/api/lean-event/events/${eventId}/assignments/bulk`,
      {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preview: false,
          roleCategory,
          notes,
          source: buildSource(),
        }),
      }
    );

    const payload = (await response.json()) as {
      error?: string;
      assignments?: EventAssignmentWithContact[];
      created?: number;
    };
    setPending(false);

    if (!response.ok || !payload.assignments) {
      setError(payload.error ?? "Assegnazione gruppo non riuscita.");
      return;
    }

    onAssigned(payload.assignments);
    setOpen(false);
    setPreview(null);
    setSelectedTags([]);
    setOrganization("");
    setSourceEventId("");
    setSourceRoleCategory("");
    setNotes("");
  }

  const canPreview =
    sourceType === "tags"
      ? selectedTags.length > 0
      : sourceType === "organization"
        ? organization.length > 0
        : sourceEventId.length > 0;

  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-4">
      {!embedded ? (
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="text-xs font-semibold uppercase tracking-[0.1em] text-leanme-fuchsia transition hover:text-white"
      >
        {open ? "− Chiudi aggiunta gruppo" : "+ Aggiungi gruppo di contatti"}
      </button>
      ) : (
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/45">
          Import massivo da rubrica
        </p>
      )}

      {open || embedded ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-white/60">
            Importa in blocco dalla rubrica per tag, azienda o partecipazione a
            un evento passato.
          </p>

          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "tags", label: "Per tag" },
                { id: "organization", label: "Per azienda" },
                { id: "past_event", label: "Da evento passato" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSourceType(item.id);
                  setPreview(null);
                }}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${
                  sourceType === item.id
                    ? "bg-leanme-fuchsia text-white"
                    : "border border-white/15 text-white/70"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {sourceType === "tags" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTagMatch("any")}
                  className={`rounded-full px-3 py-1 text-[11px] ${
                    tagMatch === "any"
                      ? "bg-white/15 text-white"
                      : "text-white/50"
                  }`}
                >
                  Qualsiasi tag
                </button>
                <button
                  type="button"
                  onClick={() => setTagMatch("all")}
                  className={`rounded-full px-3 py-1 text-[11px] ${
                    tagMatch === "all"
                      ? "bg-white/15 text-white"
                      : "text-white/50"
                  }`}
                >
                  Tutti i tag
                </button>
              </div>
              {availableTags.length === 0 ? (
                <p className="text-sm text-white/45">
                  Nessun tag in rubrica. Aggiungi tag ai contatti.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`rounded-full px-3 py-1.5 text-xs ${
                        selectedTags.includes(tag)
                          ? "bg-leanme-fuchsia text-white"
                          : "border border-white/15 text-white/70"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {sourceType === "organization" ? (
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
                Organizzazione / azienda
              </span>
              <select
                value={organization}
                onChange={(event) => {
                  setOrganization(event.target.value);
                  setPreview(null);
                }}
                className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
              >
                <option value="">Seleziona azienda</option>
                {availableOrganizations.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {sourceType === "past_event" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
                  Evento sorgente
                </span>
                <select
                  value={sourceEventId}
                  onChange={(event) => {
                    setSourceEventId(event.target.value);
                    setPreview(null);
                  }}
                  className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
                >
                  <option value="">Seleziona evento</option>
                  {otherEvents.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
                  Ruolo sorgente (opzionale)
                </span>
                <select
                  value={sourceRoleCategory}
                  onChange={(event) => {
                    setSourceRoleCategory(event.target.value);
                    setPreview(null);
                  }}
                  className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
                >
                  <option value="">Tutti i ruoli</option>
                  {roleCategories.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
                Ruolo su questo evento *
              </span>
              <select
                value={roleCategory}
                onChange={(event) => {
                  setRoleCategory(event.target.value as LeonardoEventRoleCategory);
                  setPreview(null);
                }}
                className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
              >
                {roleCategories.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
                Note (opzionale)
              </span>
              <input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
              />
            </label>
          </div>

          {preview ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              <p>
                {preview.matched} contatti nel gruppo · {preview.alreadyAssigned}{" "}
                già presenti · <strong>{preview.toAdd} da aggiungere</strong>
              </p>
              {preview.sampleNames.length > 0 ? (
                <p className="mt-2 text-xs text-emerald-100/80">
                  Anteprima: {preview.sampleNames.join(", ")}
                  {preview.toAdd > preview.sampleNames.length ? "…" : ""}
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={pending || !canPreview}
              onClick={handlePreview}
              className="rounded-full border border-white/20 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:border-leanme-fuchsia disabled:opacity-60"
            >
              {pending ? "Calcolo…" : "Anteprima"}
            </button>
            <button
              type="button"
              disabled={pending || !preview || preview.toAdd === 0}
              onClick={handleApply}
              className="rounded-full bg-leanme-fuchsia px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark disabled:opacity-60"
            >
              {pending ? "Assegnazione…" : `Aggiungi ${preview?.toAdd ?? 0} contatti`}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
