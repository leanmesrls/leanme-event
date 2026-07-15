/**
 * Dry-run: elenca quante entità JSON esistono per tenant (filesystem locale).
 * Uso: node --experimental-strip-types non; script pure JS sotto scripts/
 *
 * npm run lean-event:migrate-neon-dry  (da aggiungere quando cablato)
 *
 * Questo file documenta il piano migrazione Fase B.
 * Implementazione runtime: scripts/migrate-lean-event-blob-to-neon.mjs (prossimo passo).
 */

export const NEON_MIGRATION_COLLECTIONS = [
  { entityType: "event", blobRoot: "lean-event/events", fsDir: "events" },
  { entityType: "contact", blobRoot: "lean-event/contacts", fsDir: "contacts" },
  { entityType: "supplier", blobRoot: "lean-event/suppliers", fsDir: "suppliers" },
  { entityType: "venue", blobRoot: "lean-event/venues", fsDir: "venues" },
  {
    entityType: "assignment",
    blobRoot: "lean-event/event-assignments",
    fsDir: "event-assignments",
  },
  {
    entityType: "workspace",
    blobRoot: "lean-event/workspaces",
    fsDir: "workspaces",
  },
] as const;

export type NeonMigrationCollection = (typeof NEON_MIGRATION_COLLECTIONS)[number];
