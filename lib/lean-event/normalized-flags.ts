import { readLeanEventEnv } from "@/lib/lean-event/env";
import { isLeanEventDatabaseEnabled } from "@/lib/lean-event/db";

/** Write path primario = tabelle tipizzate (cutover N2+). */
export function isLeanEventNormalizedSot(): boolean {
  const raw = readLeanEventEnv("LEAN_EVENT_NORMALIZED_SOT");
  if (raw === "1" || raw === "true") {
    return isLeanEventDatabaseEnabled();
  }
  return false;
}

/** Read path primario = tabelle tipizzate (cutover N3+). */
export function isLeanEventReadNormalized(): boolean {
  const raw = readLeanEventEnv("LEAN_EVENT_READ_NORMALIZED");
  if (raw === "1" || raw === "true") {
    return isLeanEventDatabaseEnabled();
  }
  return false;
}

/**
 * Continua upsert su lean_event_entities come mirror legacy.
 * Default: on se SoT normalizzato (rollback); off solo se mirror esplicitamente disabilitato.
 */
export function isLeanEventLegacyEntityMirror(): boolean {
  const raw = readLeanEventEnv("LEAN_EVENT_LEGACY_ENTITY_MIRROR");
  if (raw === "0" || raw === "false") {
    return false;
  }
  if (raw === "1" || raw === "true") {
    return isLeanEventDatabaseEnabled();
  }
  // Default: mirror attivo mentre SoT è normalizzato
  return isLeanEventNormalizedSot();
}
