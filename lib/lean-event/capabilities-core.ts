import type { LeanEventLeonardoCapabilities, LeanEventModule } from "@/types/lean-event";

export type LeonardoCapabilityKey = keyof LeanEventLeonardoCapabilities;

export const LEONARDO_UPGRADE_EMAIL = "info@leanme.it";

export const LEONARDO_UPGRADE_HINT =
  "contatta LeanMe per l'upload dei tuoi servizi";

export function emptyLeonardoCapabilities(): LeanEventLeonardoCapabilities {
  return {
    hub: false,
    verbali: false,
    eventi: false,
    contatti: false,
    fornitori: false,
    clienti: false,
    finance: false,
    lean_human: false,
    government: false,
    ai_translations: false,
    hotel: false,
    logistica: false,
    budget: false,
    comunicazioni: false,
    ospiti: false,
    docenti: false,
    delegazioni: false,
    registrazione: false,
    abstract: false,
    survey: false,
    connect: false,
    ecm: false,
    stampati: false,
    archivio_mail: false,
    public_site: false,
    participant_portal: false,
    payments_paypal: false,
    ai_writing: false,
    ai_graphics: false,
    ai_assistant: false,
  };
}

export function fullLeonardoCapabilities(): LeanEventLeonardoCapabilities {
  return {
    hub: true,
    verbali: true,
    eventi: true,
    contatti: true,
    fornitori: true,
    clienti: true,
    finance: true,
    lean_human: true,
    government: true,
    ai_translations: true,
    hotel: true,
    logistica: true,
    budget: true,
    comunicazioni: true,
    ospiti: true,
    docenti: true,
    delegazioni: true,
    registrazione: true,
    abstract: true,
    survey: true,
    connect: true,
    ecm: true,
    stampati: true,
    archivio_mail: true,
    public_site: true,
    participant_portal: true,
    payments_paypal: true,
    ai_writing: true,
    ai_graphics: true,
    ai_assistant: true,
  };
}

export function tenantHasLeanEventAccess(modules: LeanEventModule[]): boolean {
  return (
    modules.includes("leonardo") ||
    modules.includes("events") ||
    modules.includes("government")
  );
}
