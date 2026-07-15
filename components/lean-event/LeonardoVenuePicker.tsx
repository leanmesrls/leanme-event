"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { LeonardoSearchableVenueSelect } from "@/components/lean-event/LeonardoSearchableVenueSelect";
import { buildVenueSnapshot } from "@/lib/lean-event/venue-display";
import { leanEventLeonardoSediPath } from "@/lib/lean-event/paths";
import type { LeonardoVenue } from "@/types/lean-event";

type VenuePickerMode = "rubrica" | "libero";

interface LeonardoVenuePickerProps {
  tenantSlug: string;
  venues: LeonardoVenue[];
  venueId: string | null;
  venueText: string;
  onChange: (value: { venueId: string | null; venue: string }) => void;
}

function resolveInitialMode(
  venueId: string | null,
  venueText: string
): VenuePickerMode {
  if (venueId) {
    return "rubrica";
  }
  if (venueText.trim()) {
    return "libero";
  }
  return "rubrica";
}

export function LeonardoVenuePicker({
  tenantSlug,
  venues,
  venueId,
  venueText,
  onChange,
}: LeonardoVenuePickerProps) {
  const [mode, setMode] = useState<VenuePickerMode>(() =>
    resolveInitialMode(venueId, venueText)
  );

  useEffect(() => {
    if (venueId) {
      setMode("rubrica");
      return;
    }
    if (!venueText.trim()) {
      setMode("rubrica");
    }
  }, [venueId, venueText]);

  const selected = venues.find((venue) => venue.id === venueId) ?? null;

  function handleSelectVenue(nextId: string) {
    if (!nextId) {
      onChange({ venueId: null, venue: venueText });
      return;
    }
    const venue = venues.find((item) => item.id === nextId);
    if (!venue) {
      return;
    }
    setMode("rubrica");
    onChange({
      venueId: venue.id,
      venue: buildVenueSnapshot(venue),
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/45">
          Sede evento
        </span>
        <Link
          href={leanEventLeonardoSediPath(tenantSlug)}
          className="text-[11px] font-semibold uppercase tracking-[0.08em] text-leanme-fuchsia hover:underline"
        >
          Rubrica sedi
        </Link>
      </div>

      <label className="flex items-center gap-2 text-sm text-white/70">
        <input
          type="radio"
          checked={mode === "rubrica"}
          onChange={() => setMode("rubrica")}
          className="accent-leanme-fuchsia"
        />
        Dalla rubrica sedi (ricerca)
      </label>

      {mode === "rubrica" ? (
        <>
          <LeonardoSearchableVenueSelect
            venues={venues}
            value={venueId ?? ""}
            onChange={handleSelectVenue}
            emptyLabel={
              venues.length === 0
                ? "Nessuna sede in rubrica — importa da Sedi o usa testo libero"
                : "Cerca hotel o sede per nome, città, provincia…"
            }
          />
          {selected ? (
            <div className="space-y-2">
              <p className="text-xs text-white/50">
                {selected.address} · {selected.city} ({selected.province})
                {selected.postalCode ? ` · ${selected.postalCode}` : ""}
              </p>
              {selected.externalUrl ? (
                <a
                  href={selected.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold uppercase tracking-[0.08em] text-leanme-fuchsia hover:underline"
                >
                  Scheda esterna →
                </a>
              ) : null}
            </div>
          ) : venues.length === 0 ? (
            <p className="text-xs text-amber-200/80">
              La rubrica sedi è vuota in produzione. Vai in{" "}
              <Link
                href={leanEventLeonardoSediPath(tenantSlug)}
                className="text-leanme-fuchsia hover:underline"
              >
                Sedi
              </Link>{" "}
              e importa almeno una sede, poi ricarica questa pagina.
            </p>
          ) : null}
        </>
      ) : null}

      <label className="flex items-center gap-2 text-sm text-white/70">
        <input
          type="radio"
          checked={mode === "libero"}
          onChange={() => {
            setMode("libero");
            onChange({ venueId: null, venue: venueText });
          }}
          className="accent-leanme-fuchsia"
        />
        Testo libero
      </label>

      {mode === "libero" ? (
        <input
          value={venueText}
          onChange={(event) =>
            onChange({ venueId: null, venue: event.target.value })
          }
          placeholder="Nome sede, indirizzo, città…"
          className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
        />
      ) : null}
    </div>
  );
}
