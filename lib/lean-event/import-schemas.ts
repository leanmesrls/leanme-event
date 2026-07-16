/** Colonne modelli Excel import Lean Event (riga 1 = header). */

export const CONTACT_IMPORT_COLUMNS = [
  "Nome",
  "Cognome",
  "Email",
  "Codice fiscale",
  "Telefono",
  "Etichetta telefono",
  "Telefono 2",
  "Etichetta telefono 2",
  "Organizzazione",
  "Tag",
  "Note",
] as const;

export const VENUE_IMPORT_COLUMNS = [
  "Nome sede",
  "Indirizzo sede",
  "Città",
  "Provincia sede",
  "CAP",
  "Telefono",
  "Email",
  "Sito web",
  "URL scheda esterna",
  "URL immagine",
  "Note",
] as const;

export const SUPPLIER_IMPORT_COLUMNS = [
  "Nome fornitore",
  "Categoria",
  "Email",
  "Telefono",
  "Indirizzo",
  "Città",
  "Provincia",
  "Partita IVA",
  "Referente",
  "Note",
] as const;

export const EVENT_IMPORT_COLUMNS = [
  "Titolo",
  "CDC",
  "Data inizio",
  "Data fine",
  "Sede",
  "Stato",
  "Note",
] as const;

export type ContactImportColumn = (typeof CONTACT_IMPORT_COLUMNS)[number];
export type VenueImportColumn = (typeof VENUE_IMPORT_COLUMNS)[number];
export type SupplierImportColumn = (typeof SUPPLIER_IMPORT_COLUMNS)[number];
export type EventImportColumn = (typeof EVENT_IMPORT_COLUMNS)[number];

export const CONTACT_IMPORT_REQUIRED = ["Nome", "Cognome"] as const;
export const VENUE_IMPORT_REQUIRED = [
  "Nome sede",
  "Indirizzo sede",
  "Città",
  "Provincia sede",
] as const;
export const SUPPLIER_IMPORT_REQUIRED = ["Nome fornitore"] as const;
export const EVENT_IMPORT_REQUIRED = ["Titolo", "Data inizio"] as const;

/** Alias header (case-insensitive) → canonical column name */
export const CONTACT_HEADER_ALIASES: Record<string, ContactImportColumn> = {
  nome: "Nome",
  cognome: "Cognome",
  email: "Email",
  "e-mail": "Email",
  "codice fiscale": "Codice fiscale",
  cf: "Codice fiscale",
  telefono: "Telefono",
  cellulare: "Telefono",
  "etichetta telefono": "Etichetta telefono",
  "telefono 2": "Telefono 2",
  "telefono_2": "Telefono 2",
  "etichetta telefono 2": "Etichetta telefono 2",
  organizzazione: "Organizzazione",
  azienda: "Organizzazione",
  tag: "Tag",
  tags: "Tag",
  etichette: "Tag",
  categoria: "Tag",
  categorie: "Tag",
  note: "Note",
};

export const VENUE_HEADER_ALIASES: Record<string, VenueImportColumn> = {
  "nome sede": "Nome sede",
  sede: "Nome sede",
  "indirizzo sede": "Indirizzo sede",
  indirizzo: "Indirizzo sede",
  città: "Città",
  citta: "Città",
  "provincia sede": "Provincia sede",
  provincia: "Provincia sede",
  cap: "CAP",
  telefono: "Telefono",
  email: "Email",
  "sito web": "Sito web",
  website: "Sito web",
  "url scheda esterna": "URL scheda esterna",
  "link esterno": "URL scheda esterna",
  "url immagine": "URL immagine",
  "immagine": "URL immagine",
  "cover": "URL immagine",
  note: "Note",
};

export const SUPPLIER_HEADER_ALIASES: Record<string, SupplierImportColumn> = {
  "nome fornitore": "Nome fornitore",
  nome: "Nome fornitore",
  fornitore: "Nome fornitore",
  categoria: "Categoria",
  email: "Email",
  telefono: "Telefono",
  indirizzo: "Indirizzo",
  città: "Città",
  citta: "Città",
  provincia: "Provincia",
  "partita iva": "Partita IVA",
  "p.iva": "Partita IVA",
  piva: "Partita IVA",
  referente: "Referente",
  note: "Note",
};

export const EVENT_HEADER_ALIASES: Record<string, EventImportColumn> = {
  titolo: "Titolo",
  "nome evento": "Titolo",
  evento: "Titolo",
  cdc: "CDC",
  "data inizio": "Data inizio",
  inizio: "Data inizio",
  "data fine": "Data fine",
  fine: "Data fine",
  sede: "Sede",
  location: "Sede",
  stato: "Stato",
  status: "Stato",
  note: "Note",
};

export const LEAN_EVENT_IMPORT_TEMPLATE_PATHS = {
  contacts: "/assets/lean-event/import/lean-event-rubrica-contatti.xlsx",
  venues: "/assets/lean-event/import/lean-event-rubrica-sedi.xlsx",
  suppliers: "/assets/lean-event/import/lean-event-rubrica-fornitori.xlsx",
  events: "/assets/lean-event/import/lean-event-elenco-eventi.xlsx",
} as const;
