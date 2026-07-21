"use client";

import Link from "next/link";
import { useState } from "react";

import { LeonardoAddressFields } from "@/components/lean-event/LeonardoAddressFields";
import { LeonardoSearchableVenueSelect } from "@/components/lean-event/LeonardoSearchableVenueSelect";
import {
  buildVenueSnapshotFromDetails,
  emptyVenueDetails,
  normalizeVenueDetails,
  parseVenueSnapshotToDetails,
  venueDetailsFromLeonardoVenue,
} from "@/lib/lean-event/venue-display";
import { leanEventLeonardoSediPath } from "@/lib/lean-event/paths";
import type {
  LeonardoEventVenueDetails,
  LeonardoVenue,
} from "@/types/lean-event";

type VenuePickerMode = "rubrica" | "libero" | "online";

interface LeonardoVenuePickerProps {
  tenantSlug: string;
  venues: LeonardoVenue[];
  venueId: string | null;
  venueText: string;
  venueDetails?: LeonardoEventVenueDetails | null;
  nameRequired?: boolean;
  onChange: (value: {
    venueId: string | null;
    venue: string;
    venueDetails: LeonardoEventVenueDetails;
  }) => void;
}

function resolveInitialMode(
  venueId: string | null,
  venueText: string,
  venueDetails?: LeonardoEventVenueDetails | null
): VenuePickerMode {
  // Solo il flag esplicito: lo snapshot "ONLINE · …" non deve bloccare rubrica/libero.
  if (venueDetails?.isOnline === true) {
    return "online";
  }
  if (venueId) {
    return "rubrica";
  }
  if (venueText.trim()) {
    return "libero";
  }
  return "rubrica";
}

function resolveInitialDetails(
  venueId: string | null,
  venues: LeonardoVenue[],
  venueDetails: LeonardoEventVenueDetails | null | undefined,
  venueText: string
): LeonardoEventVenueDetails {
  if (venueDetails) {
    return normalizeVenueDetails(venueDetails);
  }
  if (venueId) {
    const linked = venues.find((venue) => venue.id === venueId);
    if (linked) {
      return venueDetailsFromLeonardoVenue(linked);
    }
  }
  if (venueText.trim()) {
    return parseVenueSnapshotToDetails(venueText);
  }
  return emptyVenueDetails();
}

function PhysicalVenueFields({
  details,
  onChange,
  nameRequired = false,
}: {
  details: LeonardoEventVenueDetails;
  onChange: (details: LeonardoEventVenueDetails) => void;
  nameRequired?: boolean;
}) {
  function patch(partial: Partial<LeonardoEventVenueDetails>) {
    onChange(
      normalizeVenueDetails({ ...details, ...partial, isOnline: false })
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1 block text-white/60">
          Nome sede{nameRequired ? " *" : ""}
        </span>
        <input
          required={nameRequired}
          value={details.name === "ONLINE" ? "" : details.name}
          onChange={(event) => patch({ name: event.target.value })}
          placeholder="Hotel / location"
          className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
        />
      </label>
      <LeonardoAddressFields
        value={{
          address: details.address,
          city: details.city,
          province: details.province,
          region: details.region ?? "",
          postalCode: details.postalCode,
          country: details.country || "Italia",
        }}
        onChange={(address) => patch(address)}
      />
      <label className="block text-sm">
        <span className="mb-1 block text-white/60">
          Altre informazioni (es. nome sala)
        </span>
        <input
          value={details.notes}
          onChange={(event) => patch({ notes: event.target.value })}
          placeholder="Sala plenaria, piano, indicazioni…"
          className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
        />
      </label>
    </div>
  );
}

export function LeonardoVenuePicker({
  tenantSlug,
  venues,
  venueId,
  venueText,
  venueDetails,
  nameRequired = false,
  onChange,
}: LeonardoVenuePickerProps) {
  // Modalità gestita solo da azioni utente (radio): niente sync da props
  // che ripristinava ONLINE dopo il cambio.
  const [mode, setMode] = useState<VenuePickerMode>(() =>
    resolveInitialMode(venueId, venueText, venueDetails)
  );
  const [details, setDetails] = useState<LeonardoEventVenueDetails>(() =>
    resolveInitialDetails(venueId, venues, venueDetails, venueText)
  );

  function emit(
    nextId: string | null,
    nextDetails: LeonardoEventVenueDetails,
    nextMode: VenuePickerMode
  ) {
    const normalized = normalizeVenueDetails(nextDetails);
    setDetails(normalized);
    setMode(nextMode);
    onChange({
      venueId: nextId,
      venue: buildVenueSnapshotFromDetails(normalized),
      venueDetails: normalized,
    });
  }

  function handleSelectVenue(nextId: string) {
    if (!nextId) {
      emit(null, details, "rubrica");
      return;
    }
    const venue = venues.find((item) => item.id === nextId);
    if (!venue) {
      return;
    }
    emit(venue.id, venueDetailsFromLeonardoVenue(venue), "rubrica");
  }

  function switchToRubrica() {
    emit(null, emptyVenueDetails(), "rubrica");
  }

  function switchToLibero() {
    emit(
      null,
      {
        ...emptyVenueDetails(),
        notes: details.isOnline ? "" : details.notes,
      },
      "libero"
    );
  }

  function switchToOnline() {
    emit(
      null,
      normalizeVenueDetails({
        isOnline: true,
        onlineUrl: details.isOnline ? details.onlineUrl || "" : "",
        notes: details.isOnline ? details.notes || "" : "",
      }),
      "online"
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/45">
          Sede / luogo
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
          name="venue-picker-mode"
          checked={mode === "rubrica"}
          onChange={switchToRubrica}
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
                ? "Nessuna sede in rubrica — importa da Sedi o usa testo libero / ONLINE"
                : "Cerca hotel o sede per nome, città, provincia…"
            }
          />
          {venues.length === 0 ? (
            <p className="text-xs text-amber-200/80">
              La rubrica sedi è vuota. Vai in{" "}
              <Link
                href={leanEventLeonardoSediPath(tenantSlug)}
                className="text-leanme-fuchsia hover:underline"
              >
                Sedi
              </Link>{" "}
              oppure usa testo libero / ONLINE.
            </p>
          ) : null}
        </>
      ) : null}

      <label className="flex items-center gap-2 text-sm text-white/70">
        <input
          type="radio"
          name="venue-picker-mode"
          checked={mode === "libero"}
          onChange={switchToLibero}
          className="accent-leanme-fuchsia"
        />
        Testo libero (stessi campi)
      </label>

      <label className="flex items-center gap-2 text-sm text-white/70">
        <input
          type="radio"
          name="venue-picker-mode"
          checked={mode === "online"}
          onChange={switchToOnline}
          className="accent-leanme-fuchsia"
        />
        ONLINE (FAD / webinar)
      </label>

      {mode === "online" ? (
        <div className="space-y-3 rounded-lg border border-white/10 bg-black/30 p-3">
          <p className="text-sm font-medium text-white/80">Sede: ONLINE</p>
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">
              Link di riferimento (opzionale)
            </span>
            <input
              type="url"
              value={details.onlineUrl ?? ""}
              onChange={(event) =>
                emit(
                  null,
                  normalizeVenueDetails({
                    isOnline: true,
                    onlineUrl: event.target.value,
                    notes: details.notes,
                  }),
                  "online"
                )
              }
              placeholder="https://…"
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">Note</span>
            <input
              value={details.notes}
              onChange={(event) =>
                emit(
                  null,
                  normalizeVenueDetails({
                    isOnline: true,
                    onlineUrl: details.onlineUrl,
                    notes: event.target.value,
                  }),
                  "online"
                )
              }
              placeholder="Piattaforma, codice accesso…"
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
        </div>
      ) : (
        <PhysicalVenueFields
          details={details}
          nameRequired={nameRequired}
          onChange={(next) =>
            emit(mode === "rubrica" ? venueId : null, next, mode)
          }
        />
      )}
    </div>
  );
}
