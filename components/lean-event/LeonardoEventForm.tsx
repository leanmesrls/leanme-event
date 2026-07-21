"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  LeonardoEventTaxonomyFields,
  type EventTaxonomyFormState,
} from "@/components/lean-event/LeonardoEventTaxonomyFields";
import { LeonardoEventProjectTeamFields } from "@/components/lean-event/LeonardoEventProjectTeamFields";
import { LeonardoVenuePicker } from "@/components/lean-event/LeonardoVenuePicker";
import { LeonardoDateInput } from "@/components/lean-event/LeonardoDateInput";
import { validateEventDateRange } from "@/lib/lean-event/dates";
import { validateEventRequiredFields } from "@/lib/lean-event/event-required";
import { emptyVenueDetails } from "@/lib/lean-event/venue-display";
import { leanEventLeonardoEventPath } from "@/lib/lean-event/paths";
import type {
  LeanEventTenantUserPublic,
  LeonardoEventVenueDetails,
  LeonardoVenue,
} from "@/types/lean-event";

interface LeonardoEventFormProps {
  tenantSlug: string;
  venues: LeonardoVenue[];
  tenantUsers: LeanEventTenantUserPublic[];
}

export function LeonardoEventForm({
  tenantSlug,
  venues,
  tenantUsers,
}: LeonardoEventFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [form, setForm] = useState({
    cdc: "",
    title: "",
    venueId: null as string | null,
    venue: "",
    venueDetails: emptyVenueDetails() as LeonardoEventVenueDetails,
    startDate: "",
    endDate: "",
    notes: "",
    projectLeaderUserId: null as string | null,
    projectManagerUserIds: [] as string[],
  });
  const [taxonomy, setTaxonomy] = useState<EventTaxonomyFormState>({
    categoryId: "evento_aziendale",
    healthAreaId: null,
    ecmEnabled: false,
    ecmModality: null,
    formationEventTypeId: null,
    formationStructureName: null,
  });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const validation = validateEventDateRange(form.startDate, form.endDate);
    if (!validation.ok) {
      setDateError(validation.message);
      setLoading(false);
      return;
    }
    setDateError(null);

    const requiredError = validateEventRequiredFields({
      title: form.title,
      venue: form.venue,
      venueDetails: form.venueDetails,
      startDate: form.startDate,
      endDate: form.endDate || form.startDate,
      categoryId: taxonomy.categoryId,
      healthAreaId: taxonomy.healthAreaId,
      ecmEnabled: taxonomy.ecmEnabled,
      ecmModality: taxonomy.ecmModality,
      formationEventTypeId: taxonomy.formationEventTypeId,
      formationStructureName: taxonomy.formationStructureName,
      projectLeaderUserId: form.projectLeaderUserId,
    });
    if (requiredError) {
      setError(requiredError);
      setLoading(false);
      return;
    }

    const response = await fetch("/api/lean-event/events", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, ...taxonomy }),
    });

    const payload = (await response.json()) as {
      error?: string;
      event?: { id: string };
    };

    setLoading(false);

    if (!response.ok || !payload.event) {
      setError(payload.error ?? "Creazione evento non riuscita.");
      return;
    }

    router.push(leanEventLeonardoEventPath(tenantSlug, payload.event.id));
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-4">
      <div>
        <h2 className="text-lg font-bold">Nuovo evento</h2>
        <p className="mt-1 text-sm text-white/60">
          Obbligatori: titolo, sede, date, tipologia e Project Leader.
        </p>
      </div>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
          Titolo *
        </span>
        <input
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
        />
      </label>

      <LeonardoVenuePicker
        tenantSlug={tenantSlug}
        venues={venues}
        venueId={form.venueId}
        venueText={form.venue}
        venueDetails={form.venueDetails}
        nameRequired
        onChange={({ venueId, venue, venueDetails }) =>
          setForm((current) => ({
            ...current,
            venueId,
            venue,
            venueDetails,
          }))
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
            Data inizio (gg/mm/aaaa) *
          </span>
          <div className="mt-2">
            <LeonardoDateInput
              value={form.startDate}
              onChange={(startDate) => {
                const validation = validateEventDateRange(startDate, form.endDate);
                setDateError(validation.ok ? null : validation.message);
                setForm({ ...form, startDate });
              }}
              className="w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
            Data fine (gg/mm/aaaa) *
          </span>
          <div className="mt-2">
            <LeonardoDateInput
              value={form.endDate}
              onChange={(endDate) => {
                const validation = validateEventDateRange(form.startDate, endDate);
                setDateError(validation.ok ? null : validation.message);
                setForm({ ...form, endDate });
              }}
              className="w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </div>
        </label>
      </div>

      {dateError ? <p className="text-sm text-red-300">{dateError}</p> : null}

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
          CDC (centro di costo)
        </span>
        <input
          value={form.cdc}
          onChange={(e) => setForm({ ...form, cdc: e.target.value })}
          className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
        />
      </label>

      <LeonardoEventTaxonomyFields
        variant="category"
        value={taxonomy}
        onChange={setTaxonomy}
      />

      <LeonardoEventProjectTeamFields
        tenantUsers={tenantUsers}
        projectLeaderUserId={form.projectLeaderUserId}
        projectManagerUserIds={form.projectManagerUserIds}
        onChange={({ projectLeaderUserId, projectManagerUserIds }) =>
          setForm((current) => ({
            ...current,
            projectLeaderUserId,
            projectManagerUserIds,
          }))
        }
      />

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
          Note
        </span>
        <textarea
          rows={4}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
        />
      </label>

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
        {loading ? "Salvataggio..." : "Crea evento"}
      </button>
    </form>
  );
}
