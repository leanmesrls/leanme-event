"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { LeonardoCollapsiblePanel } from "@/components/lean-event/LeonardoCollapsiblePanel";
import { LeonardoEntityVersionsPanel } from "@/components/lean-event/LeonardoEntityVersionsPanel";
import { LeonardoRevisionConflictDialog } from "@/components/lean-event/LeonardoRevisionConflictDialog";
import { LeonardoRevisionStaleBanner } from "@/components/lean-event/LeonardoRevisionStaleBanner";
import { isRevisionConflictPayload } from "@/lib/lean-event/revision-conflict";
import { useEntityRevisionWatch } from "@/lib/lean-event/use-entity-revision-watch";
import { resolveVenueCoverSrc } from "@/lib/lean-event/venue-display";
import {
  formatInternalRatingLabel,
  formatStarCategoryLabel,
  isMeetingCongressiUrl,
} from "@/lib/lean-event/venue-normalize";
import type { LeonardoVenue } from "@/types/lean-event";

interface LeonardoVenueSheetContentProps {
  venue: LeonardoVenue;
  onVenueChange: (venue: LeonardoVenue) => void;
  onDelete?: () => void;
  deleting?: boolean;
}

export function LeonardoVenueSheetContent({
  venue,
  onVenueChange,
  onDelete,
  deleting = false,
}: LeonardoVenueSheetContentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ ...venue });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  useEffect(() => {
    setForm({ ...venue });
    setStale(null);
  }, [venue]);

  useEntityRevisionWatch({
    enabled: Boolean(venue.id),
    fetchUrl: `/api/lean-event/venues/${venue.id}`,
    localRevision: venue.revision ?? 1,
    extract: (payload) => {
      const next = (payload as { venue?: LeonardoVenue }).venue;
      if (!next) {
        return null;
      }
      return {
        revision: next.revision ?? 1,
        updatedAt: next.updatedAt,
        updatedBy: next.updatedBy,
      };
    },
    onRemoteNewer: (info) => {
      setStale({ updatedBy: info.updatedBy, updatedAt: info.updatedAt });
    },
  });

  async function reloadVenue() {
    const response = await fetch(`/api/lean-event/venues/${venue.id}`, {
      credentials: "same-origin",
    });
    const payload = (await response.json()) as { venue?: LeonardoVenue };
    if (payload.venue) {
      onVenueChange(payload.venue);
      setStale(null);
      setConflict(null);
    }
  }

  const coverSrc = resolveVenueCoverSrc(venue);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/lean-event/venues/${venue.id}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        expectedRevision: venue.revision ?? 1,
      }),
    });

    const payload = (await response.json()) as {
      error?: string;
      venue?: LeonardoVenue;
      updatedBy?: string;
      updatedAt?: string;
    };

    setSaving(false);

    if (response.status === 409 && isRevisionConflictPayload(payload)) {
      setConflict({
        updatedBy: payload.updatedBy,
        updatedAt: payload.updatedAt,
      });
      return;
    }

    if (!response.ok || !payload.venue) {
      setError(payload.error ?? "Salvataggio non riuscito.");
      return;
    }

    onVenueChange(payload.venue);
    setForm({ ...payload.venue });
    setMessage("Sede aggiornata.");
  }

  async function handleCoverUpload(file: File) {
    setUploading(true);
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`/api/lean-event/venues/${venue.id}/cover/upload`, {
      method: "POST",
      credentials: "same-origin",
      body: formData,
    });

    const payload = (await response.json()) as {
      error?: string;
      venue?: LeonardoVenue;
    };
    setUploading(false);

    if (!response.ok || !payload.venue) {
      setError(payload.error ?? "Upload immagine non riuscito.");
      return;
    }

    onVenueChange(payload.venue);
    setForm({ ...payload.venue });
    setMessage("Immagine copertina aggiornata.");
  }

  return (
    <div className="space-y-4">
      <LeonardoRevisionStaleBanner
        open={Boolean(stale)}
        updatedBy={stale?.updatedBy}
        updatedAt={stale?.updatedAt}
        onReload={() => {
          void reloadVenue();
        }}
      />
      <LeonardoRevisionConflictDialog
        open={Boolean(conflict)}
        updatedBy={conflict?.updatedBy}
        updatedAt={conflict?.updatedAt}
        onReload={() => {
          void reloadVenue();
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
        title="Copertina"
        summary={coverSrc ? "Immagine presente" : "Nessuna immagine"}
        defaultOpen={!coverSrc}
      >
        <div className="space-y-3 pt-2">
          {coverSrc ? (
            <div className="relative aspect-[16/9] max-h-48 overflow-hidden rounded-lg border border-white/10 bg-black">
              <Image
                src={coverSrc}
                alt={venue.name}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleCoverUpload(file);
                }
                event.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={uploading || saving || deleting}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:border-leanme-fuchsia disabled:opacity-60"
            >
              {uploading ? "Caricamento…" : "Carica immagine"}
            </button>
          </div>
          <input
            value={form.coverImageUrl ?? ""}
            onChange={(event) =>
              setForm({ ...form, coverImageUrl: event.target.value })
            }
            placeholder="URL immagine copertina"
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
          />
        </div>
      </LeonardoCollapsiblePanel>

      <LeonardoCollapsiblePanel
        title="Anagrafica sede"
        summary={`${venue.city} (${venue.province}) · ${formatStarCategoryLabel(venue.starCategory)}`}
        defaultOpen
      >
        <form
          id={`venue-form-${venue.id}`}
          onSubmit={handleSave}
          className="grid gap-3 pt-2 md:grid-cols-2"
        >
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block text-white/60">URL scheda esterna</span>
            <input
              value={form.externalUrl ?? ""}
              onChange={(event) => setForm({ ...form, externalUrl: event.target.value })}
              placeholder="https://www.meetingecongressi.com/it/location/…"
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
            {form.externalUrl ? (
              <a
                href={form.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs text-leanme-fuchsia hover:underline"
              >
                {isMeetingCongressiUrl(form.externalUrl)
                  ? "Apri su Meeting e Congressi →"
                  : "Apri scheda esterna →"}
              </a>
            ) : null}
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block text-white/60">Nome sede *</span>
            <input
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block text-white/60">Indirizzo *</span>
            <input
              required
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">Città *</span>
            <input
              required
              value={form.city}
              onChange={(event) => setForm({ ...form, city: event.target.value })}
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">Provincia *</span>
            <input
              required
              value={form.province}
              onChange={(event) => setForm({ ...form, province: event.target.value })}
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm uppercase outline-none focus:border-leanme-fuchsia"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">CAP</span>
            <input
              value={form.postalCode}
              onChange={(event) => setForm({ ...form, postalCode: event.target.value })}
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
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
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block text-white/60">Email</span>
            <input
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block text-white/60">Sito web</span>
            <input
              value={form.website}
              onChange={(event) => setForm({ ...form, website: event.target.value })}
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
        </form>
      </LeonardoCollapsiblePanel>

      <LeonardoCollapsiblePanel
        title="Valutazione interna"
        summary={
          venue.internalRating > 0
            ? formatInternalRatingLabel(venue.internalRating)
            : "Non valutata"
        }
      >
        <div className="grid gap-3 pt-2 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">Categoria stelle</span>
            <input
              value={form.starCategory ?? ""}
              onChange={(event) =>
                setForm({ ...form, starCategory: event.target.value })
              }
              placeholder="es. 4 stelle superior"
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">Valutazione interna (1–5)</span>
            <select
              value={form.internalRating ?? 0}
              onChange={(event) =>
                setForm({
                  ...form,
                  internalRating: Number(event.target.value),
                })
              }
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            >
              <option value={0}>Non valutata</option>
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {formatInternalRatingLabel(value)} ({value}/5)
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block text-white/60">Recensione interna</span>
            <textarea
              rows={3}
              value={form.internalReview ?? ""}
              onChange={(event) =>
                setForm({ ...form, internalReview: event.target.value })
              }
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block text-white/60">Note</span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
        </div>
      </LeonardoCollapsiblePanel>

      <LeonardoEntityVersionsPanel
        entityType="venue"
        entityId={venue.id}
        currentRevision={venue.revision}
        onRestored={(entity) => {
          onVenueChange(entity as LeonardoVenue);
        }}
      />

      <div className="flex flex-wrap gap-3 border-t border-white/10 pt-4">
        <button
          type="submit"
          form={`venue-form-${venue.id}`}
          disabled={saving || deleting || uploading}
          className="rounded-full bg-leanme-fuchsia px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark disabled:opacity-60"
        >
          {saving ? "Salvataggio…" : "Salva sede"}
        </button>
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting || saving || uploading}
            className="rounded-full border border-red-500/40 px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-red-200 transition hover:bg-red-500/10 disabled:opacity-60"
          >
            {deleting ? "Eliminazione…" : "Elimina"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
