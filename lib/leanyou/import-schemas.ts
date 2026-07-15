/** Colonne modelli Excel import LeanYou (riga 1 = header). */

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

export type ContactImportColumn = (typeof CONTACT_IMPORT_COLUMNS)[number];
export type VenueImportColumn = (typeof VENUE_IMPORT_COLUMNS)[number];

export const CONTACT_IMPORT_REQUIRED = ["Nome", "Cognome"] as const;
export const VENUE_IMPORT_REQUIRED = [
  "Nome sede",
  "Indirizzo sede",
  "Città",
  "Provincia sede",
] as const;

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

export const LEANYOU_IMPORT_TEMPLATE_PATHS = {
  contacts: "/assets/leanyou/import/leanyou-rubrica-contatti.xlsx",
  venues: "/assets/leanyou/import/leanyou-rubrica-sedi.xlsx",
} as const;
