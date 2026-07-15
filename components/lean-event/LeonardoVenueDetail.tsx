"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { formatVenueLabel, resolveVenueCoverSrc } from "@/lib/lean-event/venue-display";
import {
  formatInternalRatingLabel,
  formatStarCategoryLabel,
  isMeetingCongressiUrl,
} from "@/lib/lean-event/venue-normalize";
import { leanEventLeonardoSediPath } from "@/lib/lean-event/paths";
import type { LeonardoVenue } from "@/types/lean-event";

interface LeonardoVenueDetailProps {
  tenantSlug: string;
  initialVenue: LeonardoVenue;
}

export function LeonardoVenueDetail({
  tenantSlug,
  initialVenue,
}: LeonardoVenueDetailProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [venue, setVenue] = useState(initialVenue);
  const [form, setForm] = useState({ ...initialVenue });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      body: JSON.stringify(form),
    });

    const payload = (await response.json()) as {
      error?: string;
      venue?: LeonardoVenue;
    };

    setSaving(false);

    if (!response.ok || !payload.venue) {
      setError(payload.error ?? "Salvataggio non riuscito.");
      return;
    }

    setVenue(payload.venue);
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

    setVenue(payload.venue);
    setForm({ ...payload.venue });
    setMessage("Immagine copertina aggiornata.");
  }

  async function handleDelete() {
    if (!window.confirm(`Eliminare ${formatVenueLabel(venue)} dalla rubrica?`)) {
      return;
    }

    setDeleting(true);
    const response = await fetch(`/api/lean-event/venues/${venue.id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    setDeleting(false);

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Eliminazione non riuscita.");
      return;
    }

    router.push(leanEventLeonardoSediPath(tenantSlug));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={leanEventLeonardoSediPath(tenantSlug)}
          className="text-xs font-semibold uppercase tracking-[0.1em] text-leanme-fuchsia"
        >
          ← Torna alla rubrica sedi
        </Link>
        <h2 className="mt-3 text-2xl font-bold">{venue.name}</h2>
        <p className="mt-1 text-sm text-white/60">
          {venue.city} ({venue.province})
          {venue.starCategory ? ` · ${formatStarCategoryLabel(venue.starCategory)}` : ""}
          {venue.internalRating > 0
            ? ` · Int. ${formatInternalRatingLabel(venue.internalRating)}`
            : ""}
          {" · "}aggiornata{" "}
          {new Date(venue.updatedAt).toLocaleDateString("it-IT")}
        </p>
        {form.externalUrl ? (
          <a
            href={form.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs font-semibold uppercase tracking-[0.08em] text-leanme-fuchsia hover:underline"
          >
            {isMeetingCongressiUrl(form.externalUrl)
              ? "Apri su Meeting e Congressi →"
              : "Apri scheda esterna →"}
          </a>
        ) : null}
      </div>

      {coverSrc ? (
        <div className="relative aspect-[16/9] max-h-64 overflow-hidden rounded-xl border border-white/10 bg-black">
          <Image
            src={coverSrc}
            alt={venue.name}
            fill
            unoptimized
            className="object-cover"
          />
        </div>
      ) : null}

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
        className="grid gap-3 rounded-xl border border-white/10 bg-[#111111] p-6 md:grid-cols-2"
      >
        <div className="space-y-3 md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/45">
            Immagine copertina
          </p>
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
            <span className="text-xs text-white/45">oppure incolla URL sotto (max 5 MB)</span>
          </div>
          <input
            value={form.coverImageUrl ?? ""}
            onChange={(event) =>
              setForm({ ...form, coverImageUrl: event.target.value })
            }
            placeholder="https://… oppure lascia vuoto"
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
          />
        </div>

        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block text-white/60">URL scheda esterna (Meeting e Congressi)</span>
          <input
            value={form.externalUrl ?? ""}
            onChange={(event) => setForm({ ...form, externalUrl: event.target.value })}
            placeholder="https://www.meetingecongressi.com/it/location/…"
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
          />
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
            placeholder="Esperienza dell'agenzia, punti di forza, criticità…"
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

        <div className="flex flex-wrap gap-3 md:col-span-2">
          <button
            type="submit"
            disabled={saving || deleting || uploading}
            className="rounded-full bg-leanme-fuchsia px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark disabled:opacity-60"
          >
            {saving ? "Salvataggio…" : "Salva modifiche"}
          </button>
          <button
            type="button"
            disabled={saving || deleting || uploading}
            onClick={handleDelete}
            className="rounded-full border border-red-500/40 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-red-200 transition hover:border-red-400 disabled:opacity-60"
          >
            {deleting ? "Eliminazione…" : "Elimina sede"}
          </button>
        </div>
      </form>
    </div>
  );
}
