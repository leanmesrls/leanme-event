import taxonomyData from "@/data/leanyou/event-taxonomy.json";
import type {
  LeonardoEcmModality,
  LeonardoEvent,
  LeonardoEventCategoryId,
} from "@/types/leanyou";

import { normalizeHotelBlocks } from "./event-hotel";
import { normalizeRelatedEvents } from "./related-events";

export type EventTaxonomyConfig = typeof taxonomyData;

const taxonomy = taxonomyData as EventTaxonomyConfig;

export function getEventTaxonomy(): EventTaxonomyConfig {
  return taxonomy;
}

export function isHealthFormationCategory(
  categoryId: LeonardoEventCategoryId
): boolean {
  return categoryId === "formazione_sanitaria";
}

export function getCategoryLabel(categoryId: LeonardoEventCategoryId): string {
  return (
    taxonomy.categories.find((category) => category.id === categoryId)?.label ??
    categoryId
  );
}

export function getHealthAreaLabel(healthAreaId: string | null): string | null {
  if (!healthAreaId) {
    return null;
  }
  const area = taxonomy.healthAreas.find((item) => item.id === healthAreaId);
  if (!area || "parentOnly" in area && area.parentOnly) {
    return null;
  }
  return area.label;
}

export function getEcmModalityLabel(
  modality: LeonardoEcmModality | null
): string | null {
  if (!modality) {
    return null;
  }
  return (
    taxonomy.ecmModalities.find((item) => item.id === modality)?.label ?? modality
  );
}

export function normalizeLeonardoEvent(event: LeonardoEvent): LeonardoEvent {
  const categoryId =
    event.categoryId ??
    (event.type === "ecm" ? "formazione_sanitaria" : "evento_aziendale");

  const ecmEnabled =
    event.ecmEnabled ??
    (event.type === "ecm" ? true : categoryId === "formazione_sanitaria" ? null : false);

  return {
    ...event,
    categoryId,
    healthAreaId: event.healthAreaId ?? null,
    ecmEnabled,
    ecmModality: event.ecmModality ?? null,
    venueId: event.venueId ?? null,
    hotelBlocks: normalizeHotelBlocks(event),
    relatedEvents: normalizeRelatedEvents(event.relatedEvents),
    type: event.type ?? (ecmEnabled ? "ecm" : "base"),
  };
}

export function validateEventTaxonomy(input: {
  categoryId: LeonardoEventCategoryId;
  healthAreaId?: string | null;
  ecmEnabled?: boolean | null;
  ecmModality?: LeonardoEcmModality | null;
}): string | null {
  if (isHealthFormationCategory(input.categoryId)) {
    if (!input.healthAreaId) {
      return "Seleziona l'area sanitaria per un evento di formazione sanitaria.";
    }
    const area = taxonomy.healthAreas.find((item) => item.id === input.healthAreaId);
    if (!area || ("parentOnly" in area && area.parentOnly)) {
      return "Seleziona un'area sanitaria valida.";
    }
    if (input.ecmEnabled === null || input.ecmEnabled === undefined) {
      return "Indica se l'evento prevede crediti ECM (Sì/No).";
    }
    if (input.ecmEnabled && !input.ecmModality) {
      return "Seleziona la tipologia di formazione ECM.";
    }
    if (!input.ecmEnabled) {
      return null;
    }
    return null;
  }

  if (input.ecmEnabled) {
    return "I crediti ECM sono disponibili solo per eventi di formazione sanitaria.";
  }

  return null;
}

export function formatEventTaxonomySummary(event: LeonardoEvent): string {
  const normalized = normalizeLeonardoEvent(event);
  const parts = [getCategoryLabel(normalized.categoryId)];

  if (isHealthFormationCategory(normalized.categoryId)) {
    const area = getHealthAreaLabel(normalized.healthAreaId);
    if (area) {
      parts.push(area);
    }
    if (normalized.ecmEnabled === true) {
      parts.push("ECM");
      const modality = getEcmModalityLabel(normalized.ecmModality);
      if (modality) {
        parts.push(modality);
      }
    } else if (normalized.ecmEnabled === false) {
      parts.push("Non ECM");
    }
  }

  return parts.join(" · ");
}
