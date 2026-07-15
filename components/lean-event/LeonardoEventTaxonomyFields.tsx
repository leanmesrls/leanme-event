"use client";

import taxonomy from "@/data/lean-event/event-taxonomy.json";
import {
  isHealthFormationCategory,
  type EventTaxonomyConfig,
} from "@/lib/lean-event/event-taxonomy";
import type {
  LeonardoEcmModality,
  LeonardoEventCategoryId,
} from "@/types/lean-event";

const taxonomyConfig = taxonomy as EventTaxonomyConfig;

export interface EventTaxonomyFormState {
  categoryId: LeonardoEventCategoryId;
  healthAreaId: string | null;
  ecmEnabled: boolean | null;
  ecmModality: LeonardoEcmModality | null;
}

interface LeonardoEventTaxonomyFieldsProps {
  value: EventTaxonomyFormState;
  onChange: (value: EventTaxonomyFormState) => void;
}

export function LeonardoEventTaxonomyFields({
  value,
  onChange,
}: LeonardoEventTaxonomyFieldsProps) {
  const isHealth = isHealthFormationCategory(value.categoryId);
  const selectableAreas = taxonomyConfig.healthAreas.filter(
    (area) => !("parentOnly" in area && area.parentOnly)
  );

  function updateCategory(categoryId: LeonardoEventCategoryId) {
    if (isHealthFormationCategory(categoryId)) {
      onChange({
        categoryId,
        healthAreaId: value.healthAreaId,
        ecmEnabled:
          value.categoryId === "formazione_sanitaria" ? value.ecmEnabled : null,
        ecmModality: value.ecmModality,
      });
      return;
    }

    onChange({
      categoryId,
      healthAreaId: null,
      ecmEnabled: false,
      ecmModality: null,
    });
  }

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
            updateCategory(event.target.value as LeonardoEventCategoryId)
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
                  onChange={() =>
                    onChange({ ...value, ecmEnabled: true })
                  }
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
                      ecmModality: null,
                    })
                  }
                />
                No
              </label>
            </div>
          </fieldset>

          {value.ecmEnabled ? (
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
                Tipologia formazione ECM *
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
          ) : null}
        </>
      ) : null}
    </div>
  );
}
