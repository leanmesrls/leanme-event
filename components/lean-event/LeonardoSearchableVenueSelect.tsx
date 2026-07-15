"use client";

import { useMemo, useState } from "react";

import { formatVenueLabel, venueMatchesQuery } from "@/lib/lean-event/venue-display";
import type { LeonardoVenue } from "@/types/lean-event";

interface LeonardoSearchableVenueSelectProps {
  venues: LeonardoVenue[];
  value: string;
  onChange: (venueId: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  className?: string;
}

export function LeonardoSearchableVenueSelect({
  venues,
  value,
  onChange,
  placeholder = "Cerca per nome, città, provincia…",
  emptyLabel = "Seleziona sede",
  className = "",
}: LeonardoSearchableVenueSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = venues.find((venue) => venue.id === value) ?? null;

  const sortedVenues = useMemo(
    () =>
      [...venues].sort((a, b) =>
        formatVenueLabel(a).localeCompare(formatVenueLabel(b), "it")
      ),
    [venues]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) {
      return sortedVenues.slice(0, 80);
    }
    return sortedVenues
      .filter((venue) => venueMatchesQuery(venue, query))
      .slice(0, 80);
  }, [sortedVenues, query]);

  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-2">
        <input
          type="search"
          value={open ? query : selected ? formatVenueLabel(selected) : query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            if (!event.target.value.trim()) {
              onChange("");
            }
          }}
          onFocus={() => {
            setOpen(true);
            if (selected) {
              setQuery("");
            }
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 150);
          }}
          placeholder={selected && !open ? formatVenueLabel(selected) : placeholder}
          className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
        />
        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setQuery("");
            }}
            className="shrink-0 rounded-lg border border-white/15 px-3 py-2 text-xs text-white/50 hover:text-white"
            title="Deseleziona"
          >
            ×
          </button>
        ) : null}
      </div>

      {open && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-white/15 bg-[#0a0a0a] py-1 shadow-xl">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-white/45">
              Nessuna sede trovata
            </li>
          ) : (
            filtered.map((venue) => (
              <li key={venue.id}>
                <button
                  type="button"
                  className={`block w-full px-3 py-2 text-left text-sm transition hover:bg-white/10 ${
                    venue.id === value ? "bg-leanme-fuchsia/20 text-white" : "text-white/80"
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(venue.id);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  {formatVenueLabel(venue)}
                  {venue.starCategory ? (
                    <span className="ml-2 text-xs text-white/40">
                      {venue.starCategory}
                    </span>
                  ) : null}
                </button>
              </li>
            ))
          )}
          {!query.trim() && sortedVenues.length > 80 ? (
            <li className="border-t border-white/10 px-3 py-2 text-xs text-white/40">
              Digita per filtrare tra {sortedVenues.length} sedi…
            </li>
          ) : null}
        </ul>
      )}

      {!selected && !open ? (
        <p className="mt-1 text-xs text-white/40">{emptyLabel}</p>
      ) : null}
    </div>
  );
}
