"use client";

import { useEffect, useState } from "react";

import { LEONARDO_PANEL_TITLE } from "@/components/lean-event/leonardo-ui";
import { LeonardoRevisionConflictDialog } from "@/components/lean-event/LeonardoRevisionConflictDialog";
import { LeonardoDateTimeInput } from "@/components/lean-event/LeonardoDateTimeInput";
import { LeonardoVenuePicker } from "@/components/lean-event/LeonardoVenuePicker";
import {
  emptyRelatedEvent,
  normalizeRelatedEvents,
  RELATED_EVENT_KIND_LABELS,
} from "@/lib/lean-event/related-events";
import { isRevisionConflictPayload } from "@/lib/lean-event/revision-conflict";
import type {
  LeonardoEvent,
  LeonardoRelatedEvent,
  LeonardoRelatedEventKind,
  LeonardoVenue,
} from "@/types/lean-event";

function uid(): string {
  return crypto.randomUUID();
}

interface LeonardoEventRelatedEventsPanelProps {
  tenantSlug: string;
  event: LeonardoEvent;
  venues: LeonardoVenue[];
  onEventSaved: (event: LeonardoEvent) => void;
}

export function LeonardoEventRelatedEventsPanel({
  tenantSlug,
  event,
  venues,
  onEventSaved,
}: LeonardoEventRelatedEventsPanelProps) {
  const [relatedEvents, setRelatedEvents] = useState<LeonardoRelatedEvent[]>(() =>
    normalizeRelatedEvents(event.relatedEvents)
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{
    updatedBy?: string;
    updatedAt?: string;
  } | null>(null);

  useEffect(() => {
    setRelatedEvents(normalizeRelatedEvents(event.relatedEvents));
  }, [event]);

  function updateRelatedEvent(
    id: string,
    patch: Partial<LeonardoRelatedEvent>
  ) {
    setRelatedEvents((current) =>
      current.map((item) =>
        item.id === id ? emptyRelatedEvent({ ...item, ...patch, id }) : item
      )
    );
  }

  function addRelatedEvent() {
    setRelatedEvents((current) => [
      ...current,
      emptyRelatedEvent({
        id: uid(),
        kind: "attivita_extra",
        title: "",
        companionsAllowed: true,
        maxCompanionsPerGuest: 1,
      }),
    ]);
  }

  function removeRelatedEvent(id: string) {
    setRelatedEvents((current) => current.filter((item) => item.id !== id));
  }

  async function saveRelatedEvents() {
    setSaving(true);
    setMessage(null);

    const normalized = normalizeRelatedEvents(relatedEvents);
    const invalid = normalized.find(
      (item) => !item.title.trim() || !item.startsAt.trim()
    );
    if (invalid) {
      setSaving(false);
      setMessage("Ogni evento correlato richiede titolo e data/ora di inizio.");
      return;
    }

    const response = await fetch(`/api/lean-event/events/${event.id}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expectedRevision: event.revision ?? 1,
        relatedEvents: normalized,
      }),
    });

    const payload = (await response.json()) as {
      error?: string;
      event?: LeonardoEvent;
      updatedBy?: string;
      updatedAt?: string;
    };
    setSaving(false);

    if (response.status === 409 && isRevisionConflictPayload(payload)) {
      setConflict({
        updatedBy: payload.updatedBy,
        updatedAt: payload.updatedAt,
      });
      setMessage(null);
      return;
    }

    if (!response.ok || !payload.event) {
      setMessage(payload.error ?? "Salvataggio eventi correlati non riuscito.");
      return;
    }

    setRelatedEvents(normalizeRelatedEvents(payload.event.relatedEvents));
    onEventSaved(payload.event);
    setMessage("Eventi correlati salvati.");
  }

  return (
    <>
      <LeonardoRevisionConflictDialog
        open={Boolean(conflict)}
        updatedBy={conflict?.updatedBy}
        updatedAt={conflict?.updatedAt}
        onReload={() => window.location.reload()}
        onDismiss={() => setConflict(null)}
      />
    <section className="space-y-4 rounded-xl border border-white/10 bg-[#111111] p-6">
      <div>
        <h3 className={LEONARDO_PANEL_TITLE}>Eventi correlati</h3>
        <p className="mt-2 text-sm text-white/60">
          Cene di gala, cene relatori e attività extra collegate all&apos;evento.
          Gli ospiti potranno aderire e, se previsto, indicare un accompagnatore.
        </p>
      </div>

      {relatedEvents.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/15 px-4 py-6 text-sm text-white/45">
          Nessun evento correlato configurato.
        </p>
      ) : (
        relatedEvents.map((relatedEvent) => (
          <article
            key={relatedEvent.id}
            className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/45">
                {RELATED_EVENT_KIND_LABELS[relatedEvent.kind]}
              </p>
              <button
                type="button"
                onClick={() => removeRelatedEvent(relatedEvent.id)}
                className="text-xs text-white/40 hover:text-red-300"
              >
                Rimuovi
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-white/60">Tipologia</span>
                <select
                  value={relatedEvent.kind}
                  onChange={(event) =>
                    updateRelatedEvent(relatedEvent.id, {
                      kind: event.target.value as LeonardoRelatedEventKind,
                    })
                  }
                  className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
                >
                  {Object.entries(RELATED_EVENT_KIND_LABELS).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    )
                  )}
                </select>
              </label>
              <label className="block text-sm md:col-span-2">
                <span className="mb-1 block text-white/60">Titolo *</span>
                <input
                  value={relatedEvent.title}
                  onChange={(event) =>
                    updateRelatedEvent(relatedEvent.id, {
                      title: event.target.value,
                    })
                  }
                  placeholder="Es. Cena di gala · Serata relatori"
                  className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-white/60">Inizio *</span>
                <LeonardoDateTimeInput
                  value={relatedEvent.startsAt}
                  onChange={(startsAt) =>
                    updateRelatedEvent(relatedEvent.id, { startsAt })
                  }
                  className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-white/60">Fine (facoltativa)</span>
                <LeonardoDateTimeInput
                  value={relatedEvent.endsAt}
                  onChange={(endsAt) =>
                    updateRelatedEvent(relatedEvent.id, { endsAt })
                  }
                  className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
                />
              </label>
            </div>

            <LeonardoVenuePicker
              tenantSlug={tenantSlug}
              venues={venues}
              venueId={relatedEvent.venueId ?? null}
              venueText={relatedEvent.venue}
              onChange={({ venueId, venue }) =>
                updateRelatedEvent(relatedEvent.id, { venueId, venue })
              }
            />

            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={relatedEvent.companionsAllowed}
                onChange={(event) =>
                  updateRelatedEvent(relatedEvent.id, {
                    companionsAllowed: event.target.checked,
                  })
                }
                className="rounded border-white/20"
              />
              Accompagnatori ammessi
            </label>

            {relatedEvent.companionsAllowed ? (
              <label className="block max-w-xs text-sm">
                <span className="mb-1 block text-white/60">
                  Max accompagnatori per ospite
                </span>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={relatedEvent.maxCompanionsPerGuest}
                  onChange={(event) =>
                    updateRelatedEvent(relatedEvent.id, {
                      maxCompanionsPerGuest: Number(event.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
                />
              </label>
            ) : null}

            <textarea
              rows={2}
              value={relatedEvent.notes}
              onChange={(event) =>
                updateRelatedEvent(relatedEvent.id, { notes: event.target.value })
              }
              placeholder="Note operative (dress code, bus, referente…)"
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </article>
        ))
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addRelatedEvent}
          className="rounded-full border border-white/20 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white/70 transition hover:border-leanme-fuchsia hover:text-white"
        >
          + Evento correlato
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={saveRelatedEvents}
          className="rounded-full bg-leanme-fuchsia px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark disabled:opacity-60"
        >
          {saving ? "Salvataggio..." : "Salva eventi correlati"}
        </button>
      </div>

      {message ? <p className="text-sm text-leanme-fuchsia">{message}</p> : null}
    </section>
    </>
  );
}
