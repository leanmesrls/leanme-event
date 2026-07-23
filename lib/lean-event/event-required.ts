import { validateEventTaxonomy } from "@/lib/lean-event/event-taxonomy";
import type { TenantEvent } from "@/types/lean-event";

type EventRequiredPick = Pick<
  TenantEvent,
  | "title"
  | "venue"
  | "venueDetails"
  | "startDate"
  | "endDate"
  | "categoryId"
  | "healthAreaId"
  | "ecmEnabled"
  | "ecmModality"
  | "formationEventTypeId"
  | "formationStructureName"
  | "projectLeaderUserId"
>;

/** Validazione campi obbligatori scheda tecnica evento (solo categoria in tipologia). */
export function validateEventRequiredFields(
  event: EventRequiredPick
): string | null {
  if (!event.title?.trim()) {
    return "Il titolo è obbligatorio.";
  }

  const venueName =
    event.venueDetails?.name?.trim() ||
    event.venue?.trim() ||
    "";
  if (event.venueDetails?.isOnline) {
    // ONLINE è una sede valida anche senza indirizzo fisico
  } else if (!venueName) {
    return "La sede è obbligatoria (nome sede).";
  }

  if (!event.startDate?.trim()) {
    return "La data di inizio è obbligatoria.";
  }
  if (!event.endDate?.trim()) {
    return "La data di fine è obbligatoria.";
  }

  if (!event.categoryId) {
    return "Seleziona la categoria evento.";
  }

  const taxonomyError = validateEventTaxonomy(
    {
      categoryId: event.categoryId,
      healthAreaId: event.healthAreaId,
      ecmEnabled: event.ecmEnabled,
      ecmModality: event.ecmModality,
      formationEventTypeId: event.formationEventTypeId,
      formationStructureName: event.formationStructureName,
    },
    { requireFormationDetails: false }
  );
  if (taxonomyError) {
    return taxonomyError;
  }

  if (!event.projectLeaderUserId?.trim()) {
    return "Il Project Leader (REF) è obbligatorio.";
  }

  return null;
}

/** Validazione campi obbligatori tab Formazione e ECM. */
export function validateFormationEcmRequiredFields(
  event: Pick<
    TenantEvent,
    | "categoryId"
    | "healthAreaId"
    | "ecmEnabled"
    | "ecmModality"
    | "formationEventTypeId"
    | "formationStructureName"
  >
): string | null {
  return validateEventTaxonomy(
    {
      categoryId: event.categoryId,
      healthAreaId: event.healthAreaId,
      ecmEnabled: event.ecmEnabled,
      ecmModality: event.ecmModality,
      formationEventTypeId: event.formationEventTypeId,
      formationStructureName: event.formationStructureName,
    },
    { requireFormationDetails: true }
  );
}
