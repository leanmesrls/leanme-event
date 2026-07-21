import taxonomyData from "@/data/lean-event/event-taxonomy.json";
import type {
  LeonardoEcmModality,
  LeonardoEvent,
  LeonardoEventCategoryId,
  LeonardoFormationEventTypeId,
} from "@/types/lean-event";

import { normalizeEcmGrid } from "./ecm-grid";
import { normalizeHotelBlocks } from "./event-hotel";
import { normalizeEventRegistration } from "./event-registration";
import { normalizeRelatedEvents } from "./related-events";
import { normalizeScientificProgram } from "./scientific-program";

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

/** Formazione sanitaria o non sanitaria (gruppo FORMAZIONE). */
export function isFormationCategory(
  categoryId: LeonardoEventCategoryId
): boolean {
  return (
    categoryId === "formazione_sanitaria" ||
    categoryId === "formazione_non_sanitaria"
  );
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
  if (!area || ("parentOnly" in area && area.parentOnly)) {
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

export function getFormationEventTypeLabel(
  typeId: LeonardoFormationEventTypeId | null | undefined
): string | null {
  if (!typeId) {
    return null;
  }
  return (
    taxonomy.formationEventTypes.find((item) => item.id === typeId)?.label ??
    typeId
  );
}

export function formationEventTypeRequiresStructure(
  typeId: LeonardoFormationEventTypeId | null | undefined
): boolean {
  if (!typeId) {
    return false;
  }
  const item = taxonomy.formationEventTypes.find((entry) => entry.id === typeId);
  return Boolean(item && "requiresStructure" in item && item.requiresStructure);
}

export function normalizeLeonardoEvent(event: LeonardoEvent): LeonardoEvent {
  const categoryId =
    event.categoryId ??
    (event.type === "ecm" ? "formazione_sanitaria" : "evento_aziendale");

  const ecmEnabled =
    event.ecmEnabled ??
    (event.type === "ecm" ? true : categoryId === "formazione_sanitaria" ? null : false);

  const formationEventTypeId = isFormationCategory(categoryId)
    ? event.formationEventTypeId ?? null
    : null;
  const formationStructureName =
    formationEventTypeRequiresStructure(formationEventTypeId)
      ? event.formationStructureName?.trim() || null
      : null;

  return {
    ...event,
    categoryId,
    isFavorite: Boolean(event.isFavorite),
    healthAreaId: event.healthAreaId ?? null,
    ecmEnabled,
    ecmModality: event.ecmModality ?? null,
    formationEventTypeId,
    formationStructureName,
    ecmGrid: isFormationCategory(categoryId)
      ? normalizeEcmGrid(event.ecmGrid)
      : null,
    registration: normalizeEventRegistration(event.registration),
    scientificProgram: normalizeScientificProgram(event.scientificProgram),
    eventSponsors: Array.isArray(event.eventSponsors)
      ? event.eventSponsors.map((item) => ({
          id: item.id,
          contactId: item.contactId ?? null,
          companyName: item.companyName?.trim() ?? "",
          contactName: item.contactName?.trim() ?? "",
          agreementSummary: item.agreementSummary?.trim() ?? "",
          contractRef: item.contractRef?.trim() ?? "",
          sponsorshipType: item.sponsorshipType?.trim() ?? "",
          amount: item.amount?.trim() ?? "",
          notes: item.notes?.trim() ?? "",
        }))
      : event.eventSponsors ?? [],
    venueId: event.venueId ?? null,
    venueDetails: event.venueDetails
      ? {
          name: event.venueDetails.name?.trim() ?? "",
          address: event.venueDetails.address?.trim() ?? "",
          city: event.venueDetails.city?.trim() ?? "",
          province: event.venueDetails.province?.trim() ?? "",
          region: event.venueDetails.region?.trim() ?? "",
          postalCode: event.venueDetails.postalCode?.trim() ?? "",
          country: event.venueDetails.country?.trim() ?? "Italia",
          isOnline: Boolean(event.venueDetails.isOnline),
          onlineUrl: event.venueDetails.onlineUrl?.trim() ?? "",
          notes: event.venueDetails.notes?.trim() ?? "",
        }
      : event.venueDetails,
    hotelBlocks: normalizeHotelBlocks(event),
    relatedEvents: normalizeRelatedEvents(event.relatedEvents),
    projectLeaderUserId: event.projectLeaderUserId ?? null,
    projectManagerUserIds: event.projectManagerUserIds ?? [],
    type: event.type ?? (ecmEnabled ? "ecm" : "base"),
  };
}

export function validateEventTaxonomy(
  input: {
    categoryId: LeonardoEventCategoryId;
    healthAreaId?: string | null;
    ecmEnabled?: boolean | null;
    ecmModality?: LeonardoEcmModality | null;
    formationEventTypeId?: LeonardoFormationEventTypeId | null;
    formationStructureName?: string | null;
  },
  options?: {
    /** true = tab Formazione e ECM; false = scheda tecnica (solo categoria). */
    requireFormationDetails?: boolean;
  }
): string | null {
  const requireFormationDetails = options?.requireFormationDetails === true;

  if (!isFormationCategory(input.categoryId)) {
    if (input.ecmEnabled) {
      return "I crediti ECM sono disponibili solo per eventi di formazione sanitaria.";
    }
    return null;
  }

  if (!requireFormationDetails) {
    return null;
  }

  if (!input.ecmModality) {
    return "Seleziona la tipologia di formazione (RES, FAD, FSC, …).";
  }
  const modalityOk = taxonomy.ecmModalities.some(
    (item) => item.id === input.ecmModality
  );
  if (!modalityOk) {
    return "Tipologia di formazione non valida.";
  }

  if (!input.formationEventTypeId) {
    return "Seleziona la tipologia di evento.";
  }
  const typeOk = taxonomy.formationEventTypes.some(
    (item) => item.id === input.formationEventTypeId
  );
  if (!typeOk) {
    return "Tipologia di evento non valida.";
  }
  if (formationEventTypeRequiresStructure(input.formationEventTypeId)) {
    if (!input.formationStructureName?.trim()) {
      return "Specifica la struttura assistenziale / formativa.";
    }
  }

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
  }

  return null;
}

export function formatEventTaxonomySummary(event: LeonardoEvent): string {
  const normalized = normalizeLeonardoEvent(event);
  const parts = [getCategoryLabel(normalized.categoryId)];

  if (isFormationCategory(normalized.categoryId)) {
    const modality = getEcmModalityLabel(normalized.ecmModality);
    if (modality) {
      parts.push(modality);
    }
    const formationType = getFormationEventTypeLabel(
      normalized.formationEventTypeId
    );
    if (formationType) {
      parts.push(formationType);
    }
  }

  if (isHealthFormationCategory(normalized.categoryId)) {
    const area = getHealthAreaLabel(normalized.healthAreaId);
    if (area) {
      parts.push(area);
    }
    if (normalized.ecmEnabled === true) {
      parts.push("ECM");
    } else if (normalized.ecmEnabled === false) {
      parts.push("Non ECM");
    }
  }

  return parts.join(" · ");
}
