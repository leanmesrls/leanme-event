"use client";

import { LeonardoEcmFacultyForm } from "@/components/lean-event/LeonardoEcmFacultyForm";
import { LeonardoEcmGridForm } from "@/components/lean-event/LeonardoEcmGridForm";
import {
  LeonardoEventTaxonomyFields,
  type EventTaxonomyFormState,
} from "@/components/lean-event/LeonardoEventTaxonomyFields";
import { LEONARDO_CANVAS_SURFACE } from "@/components/lean-event/leonardo-ui";
import { normalizeEcmGrid } from "@/lib/lean-event/ecm-grid";
import {
  FORMATION_ECM_SECTIONS,
  type FormationEcmSectionId,
} from "@/lib/lean-event/formation-ecm-nav";
import type {
  LeanEventContact,
  LeonardoEcmGrid,
  LeonardoEvent,
} from "@/types/lean-event";

interface LeonardoEventFormationEcmPanelProps {
  event: LeonardoEvent;
  contacts: LeanEventContact[];
  section: FormationEcmSectionId;
  onSectionChange: (section: FormationEcmSectionId) => void;
  onEventChange: (event: LeonardoEvent) => void;
  onSave: () => void;
  saving: boolean;
  message: string | null;
}

export function LeonardoEventFormationEcmPanel({
  event,
  contacts,
  section,
  onSectionChange,
  onEventChange,
  onSave,
  saving,
  message,
}: LeonardoEventFormationEcmPanelProps) {
  const active =
    FORMATION_ECM_SECTIONS.find((item) => item.id === section) ??
    FORMATION_ECM_SECTIONS[0]!;

  const taxonomy: EventTaxonomyFormState = {
    categoryId: event.categoryId,
    healthAreaId: event.healthAreaId,
    ecmEnabled: event.ecmEnabled,
    ecmModality: event.ecmModality,
    formationEventTypeId: event.formationEventTypeId ?? null,
    formationStructureName: event.formationStructureName ?? null,
  };

  const grid = normalizeEcmGrid(event.ecmGrid);

  return (
    <section className={`${LEONARDO_CANVAS_SURFACE} space-y-4`}>
      <div className="flex flex-wrap gap-1.5">
        {FORMATION_ECM_SECTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSectionChange(item.id)}
            className={`shrink-0 rounded-md px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] transition sm:text-[11px] ${
              section === item.id
                ? "bg-white text-black shadow-sm"
                : item.implemented
                  ? "border border-white/25 text-white/70 hover:border-white hover:bg-white/10 hover:text-white"
                  : "border border-dashed border-white/25 text-white/45 hover:border-white/50 hover:text-white/70"
            }`}
          >
            {item.label}
            {!item.implemented ? " ·" : ""}
          </button>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-white/45">
        {active.description}
      </p>

      {section === "griglia" ? (
        <>
          <LeonardoEventTaxonomyFields
            variant="formation"
            value={taxonomy}
            onChange={(next) => onEventChange({ ...event, ...next })}
          />
          <LeonardoEcmGridForm
            value={grid}
            eventSponsors={event.eventSponsors ?? []}
            onChange={(ecmGrid: LeonardoEcmGrid) =>
              onEventChange({ ...event, ecmGrid })
            }
          />
          {message ? (
            <p className="text-sm text-leanme-fuchsia">{message}</p>
          ) : null}
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-full bg-leanme-fuchsia px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark disabled:opacity-60"
          >
            {saving ? "Salvataggio..." : "Salva griglia tecnica"}
          </button>
        </>
      ) : null}

      {section === "faculty" ? (
        <>
          <LeonardoEcmFacultyForm
            value={grid}
            contacts={contacts}
            onChange={(ecmGrid) => onEventChange({ ...event, ecmGrid })}
          />
          {message ? (
            <p className="text-sm text-leanme-fuchsia">{message}</p>
          ) : null}
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-full bg-leanme-fuchsia px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark disabled:opacity-60"
          >
            {saving ? "Salvataggio..." : "Salva faculty / speaker"}
          </button>
        </>
      ) : null}

      {section !== "griglia" && section !== "faculty" ? (
        <div className="rounded-xl border border-dashed border-white/20 bg-black/30 p-6">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-white/80">
            {active.label} — in preparazione
          </h3>
          <p className="mt-3 text-sm text-white/60">{active.description}</p>
        </div>
      ) : null}
    </section>
  );
}
