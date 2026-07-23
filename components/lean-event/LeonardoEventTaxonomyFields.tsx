"use client";

import taxonomy from "@/data/lean-event/event-taxonomy.json";
import {
  formationEventTypeRequiresStructure,
  isFormationCategory,
  isHealthFormationCategory,
  type EventTaxonomyConfig,
} from "@/lib/lean-event/event-taxonomy";
import type {
  LeonardoEcmModality,
  TenantEventCategoryId,
  LeonardoFormationEventTypeId,
} from "@/types/lean-event";

const taxonomyConfig = taxonomy as EventTaxonomyConfig;

export interface EventTaxonomyFormState {
  categoryId: TenantEventCategoryId;
  healthAreaId: string | null;
  ecmEnabled: boolean | null;
  ecmModality: LeonardoEcmModality | null;
  formationEventTypeId: LeonardoFormationEventTypeId | null;
  formationStructureName: string | null;
}

type TaxonomyFieldsVariant = "category" | "formation";

interface LeonardoEventTaxonomyFieldsProps {
  value: EventTaxonomyFormState;
  onChange: (value: EventTaxonomyFormState) => void;
  /** Scheda tecnica: solo categoria. Tab Formazione e ECM: campi subordinati. */
  variant?: TaxonomyFieldsVariant;
}

export function LeonardoEventTaxonomyFields({
  value,
  onChange,
  variant = "category",
}: LeonardoEventTaxonomyFieldsProps) {
  const isHealth = isHealthFormationCategory(value.categoryId);
  const isFormation = isFormationCategory(value.categoryId);
  const selectableAreas = taxonomyConfig.healthAreas.filter(
    (area) => !("parentOnly" in area && area.parentOnly)
  );
  const needsStructure = formationEventTypeRequiresStructure(
    value.formationEventTypeId
  );

  function updateCategory(categoryId: TenantEventCategoryId) {
    if (isFormationCategory(categoryId)) {
      onChange({
        categoryId,
        healthAreaId: isHealthFormationCategory(categoryId)
          ? value.healthAreaId
          : null,
        ecmEnabled: isHealthFormationCategory(categoryId)
          ? value.categoryId === "formazione_sanitaria"
            ? value.ecmEnabled
            : null
          : false,
        ecmModality: value.ecmModality,
        formationEventTypeId: value.formationEventTypeId,
        formationStructureName: value.formationStructureName,
      });
      return;
    }

    onChange({
      categoryId,
      healthAreaId: null,
      ecmEnabled: false,
      ecmModality: null,
      formationEventTypeId: null,
      formationStructureName: null,
    });
  }

  if (variant === "category") {
    return (
      <div className="space-y-4 rounded-xl border border-white/10 bg-black/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-leanme-fuchsia">
          Tipologia evento
        </p>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
            Categoria *
          </span>
          <select
            required
            value={value.categoryId}
            onChange={(event) =>
              updateCategory(event.target.value as TenantEventCategoryId)
            }
            className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
          >
            {taxonomyConfig.categoryGroups.map((group) => (
              <optgroup key={group.id} label={group.label}>
                {taxonomyConfig.categories
                  .filter((category) => category.groupId === group.id)
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>

        {isFormation ? (
          <p className="text-xs leading-relaxed text-white/45">
            Completa tipologia di formazione, tipologia di evento e dati ECM
            nella tab <span className="text-white/70">Formazione e ECM</span>.
          </p>
        ) : null}
      </div>
    );
  }

  if (!isFormation) {
    return (
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-6">
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-amber-100">
          Formazione e ECM non attiva
        </h3>
        <p className="mt-3 text-sm text-white/70">
          Seleziona una categoria di formazione (sanitaria o non sanitaria) nella
          scheda tecnica per abilitare questa sezione.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-black/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-leanme-fuchsia">
        Dati formazione
      </p>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
          Tipologia di formazione *
        </span>
        <select
          required
          value={value.ecmModality ?? ""}
          onChange={(event) =>
            onChange({
              ...value,
              ecmModality: (event.target.value ||
                null) as LeonardoEcmModality | null,
            })
          }
          className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
        >
          <option value="">Seleziona tipologia</option>
          {taxonomyConfig.ecmModalities.map((modality) => (
            <option key={modality.id} value={modality.id}>
              {modality.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
          Tipologia di evento *
        </span>
        <select
          required
          value={value.formationEventTypeId ?? ""}
          onChange={(event) => {
            const formationEventTypeId = (event.target.value ||
              null) as LeonardoFormationEventTypeId | null;
            onChange({
              ...value,
              formationEventTypeId,
              formationStructureName:
                formationEventTypeRequiresStructure(formationEventTypeId)
                  ? value.formationStructureName
                  : null,
            });
          }}
          className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
        >
          <option value="">Seleziona tipologia di evento</option>
          {taxonomyConfig.formationEventTypes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      {needsStructure ? (
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
            Struttura assistenziale / formativa *
          </span>
          <input
            required
            value={value.formationStructureName ?? ""}
            onChange={(event) =>
              onChange({
                ...value,
                formationStructureName: event.target.value,
              })
            }
            placeholder="Specificare la struttura"
            className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
          />
        </label>
      ) : null}

      {isHealth ? (
        <>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
              Area sanitaria *
            </span>
            <select
              required
              value={value.healthAreaId ?? ""}
              onChange={(event) =>
                onChange({
                  ...value,
                  healthAreaId: event.target.value || null,
                })
              }
              className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
            >
              <option value="">Seleziona area</option>
              {selectableAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.label}
                </option>
              ))}
            </select>
          </label>

          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
              ECM *
            </legend>
            <div className="mt-2 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-white/80">
                <input
                  type="radio"
                  name="ecm-enabled"
                  checked={value.ecmEnabled === true}
                  onChange={() => onChange({ ...value, ecmEnabled: true })}
                  className="accent-leanme-fuchsia"
                />
                Sì
              </label>
              <label className="flex items-center gap-2 text-sm text-white/80">
                <input
                  type="radio"
                  name="ecm-enabled"
                  checked={value.ecmEnabled === false}
                  onChange={() =>
                    onChange({
                      ...value,
                      ecmEnabled: false,
                    })
                  }
                  className="accent-leanme-fuchsia"
                />
                No
              </label>
            </div>
          </fieldset>
        </>
      ) : null}
    </div>
  );
}
