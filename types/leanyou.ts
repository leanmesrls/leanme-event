export type LeanYouUserRole = "admin" | "member";

export type LeanYouModule = "leonardo" | "events" | "government";

export interface LeanYouLeonardoCapabilities {
  /** Sidebar — cruscotto */
  hub: boolean;
  /** Sidebar — verbali AI */
  verbali: boolean;
  /** Sidebar — lista eventi */
  eventi: boolean;
  /** Sidebar — rubrica globale */
  contatti: boolean;
  /** Sidebar — rubrica fornitori */
  fornitori: boolean;
  /** Sidebar — rubrica clienti (in arrivo) */
  clienti: boolean;
  /** Sidebar — report budget aggregato agenzia */
  finance: boolean;
  /** Sidebar — Lean.Human (supporto umano LMI) */
  lean_human: boolean;
  /** Sidebar — Government (società scientifiche), servizio separato */
  government: boolean;
  /** Tab evento — hotel (allotment, camere) */
  hotel: boolean;
  /** Tab evento — viaggi, transfer, hospitality */
  logistica: boolean;
  /** Tab evento — preventivo/consuntivo singolo evento */
  budget: boolean;
  /** Tab evento — email, newsletter, SMS, … */
  comunicazioni: boolean;
  /** Tab evento — ospiti da rubrica per categoria ruolo */
  ospiti: boolean;
  /** Tab evento — docenti, lettere incarico */
  docenti: boolean;
  /** Tab evento */
  delegazioni: boolean;
  registrazione: boolean;
  abstract: boolean;
  survey: boolean;
  connect: boolean;
  ecm: boolean;
  stampati: boolean;
  archivio_mail: boolean;
  public_site: boolean;
  participant_portal: boolean;
  payments_paypal: boolean;
  ai_writing: boolean;
  ai_graphics: boolean;
  ai_assistant: boolean;
}

export interface LeanYouUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: LeanYouUserRole;
  passwordHash: string;
  accessToken: string;
}

export interface LeanYouTenant {
  id: string;
  name: string;
  slug: string;
  accessToken: string;
  modules: LeanYouModule[];
  /** showcase = piattaforma completa (demo); client = solo capability abilitate */
  profile?: "showcase" | "client";
  /** Preset named in data/leanyou/tenant-capability-presets.json */
  capabilityPreset?: string;
  leonardoCapabilities?: Partial<LeanYouLeonardoCapabilities>;
  users: LeanYouUser[];
}

export interface LeanYouTenantsFile {
  tenants: LeanYouTenant[];
}

export interface LeanYouSession {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: LeanYouUserRole;
  modules: LeanYouModule[];
  /** Risolto live da profile/preset — non usare snapshot JWT */
  tenantProfile?: "showcase" | "client";
  capabilityPreset?: string;
  leonardoCapabilitiesOverride?: Partial<LeanYouLeonardoCapabilities>;
  /** @deprecated Snapshot JWT al login — ignorato se presenti profile/preset; usato solo come fallback legacy */
  leonardoCapabilities?: LeanYouLeonardoCapabilities;
}

export type LeonardoWorkspaceStatus =
  | "draft"
  | "content_ready"
  | "processing"
  | "completed"
  | "failed";

export type LeonardoMeetingType =
  | "client_meeting"
  | "scientific_committee"
  | "internal_meeting";

export interface LeonardoWorkspace {
  id: string;
  tenantId: string;
  createdBy: string;
  title: string;
  client: string;
  organization: string;
  meetingDate: string;
  meetingType: LeonardoMeetingType;
  tags: string[];
  participants: string;
  moderator: string;
  secretary: string;
  notes: string;
  linkedEventId: string | null;
  status: LeonardoWorkspaceStatus;
  transcript: string;
  structured: Record<string, unknown> | null;
  documents: Record<string, string>;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export type LeonardoEventType = "base" | "ecm";

export type LeonardoEventCategoryId =
  | "formazione_sanitaria"
  | "formazione_non_sanitaria"
  | "artistico"
  | "evento_aziendale"
  | "evento_incentive"
  | "inaugurazione"
  | "vernissage"
  | "fiera";

export type LeonardoEcmModality =
  | "res"
  | "fad"
  | "fsc"
  | "blended_res_fsc"
  | "res_fad";

export type LeonardoEventStatus = "draft" | "active" | "completed" | "archived";

export interface LeonardoEvent {
  id: string;
  tenantId: string;
  createdBy: string;
  cdc: string;
  title: string;
  /** Snapshot testuale sede (da rubrica o libero) */
  venue: string;
  /** Rubrica sedi tenant — opzionale */
  venueId?: string | null;
  startDate: string;
  endDate: string;
  /** Tipologia evento (anagrafica) */
  categoryId: LeonardoEventCategoryId;
  /** Solo per formazione sanitaria */
  healthAreaId: string | null;
  /** Solo per formazione sanitaria — null finché non risposto */
  ecmEnabled: boolean | null;
  /** Obbligatorio se ecmEnabled === true */
  ecmModality: LeonardoEcmModality | null;
  /** @deprecated Usare categoryId + campi ECM */
  type?: LeonardoEventType;
  status: LeonardoEventStatus;
  notes: string;
  /** Blocchi hotel multipli con allotment per tipologia */
  hotelBlocks?: LeonardoEventHotelBlock[];
  /** Cene gala, attività satellite, ecc. */
  relatedEvents?: LeonardoRelatedEvent[];
  /** @deprecated Usare hotelBlocks */
  hotel?: LeonardoEventHotelConfig;
  /** Incrementa ad ogni salvataggio — optimistic locking multi-utente */
  revision?: number;
  updatedBy?: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  purgeAfter?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeonardoEventChatAttachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

export interface LeonardoEventChatMessage {
  id: string;
  eventId: string;
  tenantId: string;
  authorUserId: string;
  authorName: string;
  authorEmail: string;
  body: string;
  /** Percorsi interni LeanYou citati nel messaggio */
  links?: Array<{ label: string; href: string }>;
  /** Email o nomi citati con @ */
  mentions?: string[];
  attachments?: LeonardoEventChatAttachment[];
  createdAt: string;
}

export interface LeonardoRoomAllotment {
  id: string;
  /** Codice tipologia (es. DUS, DBL, MAT, STE) */
  code: string;
  label: string;
  quantity: number;
}

/** Disponibilità camere per una singola notte (non necessariamente = giorni evento). */
export interface LeonardoNightAllotment {
  id: string;
  /** Notte gg/mm/aaaa */
  nightDate: string;
  roomAllotments: LeonardoRoomAllotment[];
}

export interface LeonardoEventHotelBlock {
  id: string;
  venueId: string;
  /** Periodo convenzione hotel (opzionale, informativo) */
  checkInDate: string;
  checkOutDate: string;
  nightAllotments: LeonardoNightAllotment[];
  /** @deprecated Usare nightAllotments */
  roomAllotments?: LeonardoRoomAllotment[];
  notes: string;
}

export type LeonardoRelatedEventKind =
  | "cena_gala"
  | "cena_relatore"
  | "attivita_extra"
  | "altro";

export type LeonardoRelatedEventParticipationStatus =
  | "pending"
  | "confirmed"
  | "declined";

/** Persona accompagnatore (evento correlato o secondo occupante camera). */
export interface LeonardoCompanionPerson {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

/** Attività satellite configurata in setup (cena gala, extra, …). */
export interface LeonardoRelatedEvent {
  id: string;
  kind: LeonardoRelatedEventKind;
  title: string;
  /** Data/ora (ISO datetime-local o gg/mm/aaaa) */
  startsAt: string;
  endsAt: string;
  venue: string;
  venueId?: string | null;
  notes: string;
  companionsAllowed: boolean;
  maxCompanionsPerGuest: number;
}

/** Accompagnatore su evento correlato (contactId solo UI / se da partecipante). */
export interface LeonardoRelatedEventCompanion extends LeonardoCompanionPerson {
  contactId?: string | null;
}

export interface LeonardoRelatedEventParticipation {
  relatedEventId: string;
  status: LeonardoRelatedEventParticipationStatus;
  notes: string;
  companions: LeonardoRelatedEventCompanion[];
  /** @deprecated Usare companions */
  companion?: LeonardoCompanionPerson | null;
}

/** @deprecated Migrato in hotelBlocks */
export interface LeonardoEventHotelConfig {
  /** Hotel convenzionato — può coincidere con venueId evento */
  hotelVenueId?: string | null;
  checkInDate: string;
  checkOutDate: string;
  allotmentRooms: number;
  notes: string;
}

export type LeonardoHospitalityStatus =
  | "pending"
  | "requested"
  | "confirmed"
  | "declined";

export type LeonardoRoommateRole = "participant" | "companion_only";

export type LeonardoTravelMode = "train" | "flight" | "car" | "other";

export type LeonardoTravelDirection = "outbound" | "return";

export interface LeonardoTravelSegment {
  id: string;
  direction: LeonardoTravelDirection;
  mode: LeonardoTravelMode;
  carrier: string;
  loyaltyProgram: string;
  loyaltyCode: string;
  originCity: string;
  originAirport: string;
  destinationCity: string;
  destinationAirport: string;
  departureAt: string;
  arrivalAt: string;
  documentUrl: string;
  documentFrontUrl: string;
  documentBackUrl: string;
  notes: string;
}

export interface LeonardoNightStay {
  id: string;
  /** Notte di pernottamento (gg/mm/aaaa) */
  nightDate: string;
  hotelBlockId: string;
  nightAllotmentId: string;
  roomAllotmentId: string;
  roomTypeCode: string;
}

export interface LeonardoAssignmentHospitality {
  status: LeonardoHospitalityStatus;
  /** @deprecated Usare nightStays */
  hotelBlockId: string;
  /** @deprecated Usare nightStays */
  nightAllotmentId: string;
  /** @deprecated Usare nightStays */
  roomAllotmentId: string;
  roomTypeCode: string;
  checkIn: string;
  checkOut: string;
  /** Assegnazione camera per ogni notte di soggiorno */
  nightStays: LeonardoNightStay[];
  roommateContactId: string | null;
  roommateFirstName: string;
  roommateLastName: string;
  roommatePhone: string;
  roommateEmail: string;
  /** @deprecated Usare roommateFirstName + roommateLastName */
  roommateName: string;
  roommateRole: LeonardoRoommateRole | null;
  transferIn: boolean;
  transferOut: boolean;
  /** Minuti dopo l'arrivo dell'ultima tratta di andata */
  transferInMinutesAfter: number;
  /** Minuti prima della partenza della prima tratta di ritorno */
  transferOutMinutesBefore: number;
  /** Orario transfer arrivo (ISO datetime-local), calcolato o manuale */
  transferInTime: string;
  transferInTimeManual: boolean;
  /** Orario transfer partenza (ISO datetime-local), calcolato o manuale */
  transferOutTime: string;
  transferOutTimeManual: boolean;
  transferNotes: string;
  /** Esigenze mobilità ridotta */
  dietaryRequirements: string;
  /** Intolleranze alimentari */
  allergies: string;
  accessibilityNotes: string;
  internalNotes: string;
  travels: LeonardoTravelSegment[];
  /** @deprecated */
  roomType?: string;
  /** @deprecated */
  arrivalInfo?: string;
  /** @deprecated */
  departureInfo?: string;
  /** @deprecated */
  companionName?: string;
}

export interface LeanYouContactPhone {
  label: string;
  number: string;
}

export interface LeanYouContact {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  /** Per area riservata partecipante (accesso multi-evento) */
  fiscalCode?: string;
  phones: LeanYouContactPhone[];
  /** Etichette libere per filtri rubrica (es. docente, sponsor, BO) */
  organization: string;
  tags: string[];
  notes: string;
  revision?: number;
  updatedBy?: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  purgeAfter?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type LeonardoSupplierCategoryId =
  | "grafico"
  | "regia_tecnica"
  | "digital_innovazione"
  | "catering"
  | "ristorante"
  | "addobbi_floreali"
  | "allestimenti"
  | "fotografo"
  | "hostess"
  | "collaboratori"
  | "interpreti"
  | "pulizia"
  | "sicurezza"
  | "tipografia"
  | "trasporti";

export type LeonardoSupplierDocumentKind =
  | "accordo_generale"
  | "preventivo"
  | "fattura"
  | "altro";

export interface LeonardoSupplierDocument {
  id: string;
  title: string;
  kind: LeonardoSupplierDocumentKind;
  /** Data documento (ISO date gg/mm/aaaa in UI) */
  documentDate: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  notes: string;
  uploadedBy: string;
  createdAt: string;
}

export interface LeonardoSupplierEmailRecord {
  id: string;
  subject: string;
  /** Data/ora scambio email */
  occurredAt: string;
  direction: "inbound" | "outbound";
  fromEmail: string;
  toEmail: string;
  summary: string;
  attachmentDocumentIds: string[];
  createdAt: string;
}

/** Anagrafica fornitore in rubrica tenant. */
export interface LeanYouSupplier {
  id: string;
  tenantId: string;
  name: string;
  categoryId: LeonardoSupplierCategoryId;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  vatNumber: string;
  contactPerson: string;
  notes: string;
  /** Accordi generali archiviati in rubrica */
  agreements: LeonardoSupplierDocument[];
  revision?: number;
  updatedBy?: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  purgeAfter?: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface LeonardoEventSupplierLink {
  id: string;
  tenantId: string;
  eventId: string;
  supplierId: string;
  categoryId: LeonardoSupplierCategoryId;
  roleNotes: string;
  documents: LeonardoSupplierDocument[];
  emails: LeonardoSupplierEmailRecord[];
  createdAt: string;
  updatedAt: string;
}

/** Sede / location in rubrica tenant (riutilizzabile tra eventi). */
export interface LeonardoVenue {
  id: string;
  tenantId: string;
  /** Nome sede (hotel, centro congressi, sala…) */
  name: string;
  address: string;
  city: string;
  /** Sigla provincia (es. BO, MI) o nome esteso */
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  /** Link scheda esterna (es. MeetingeCongressi) */
  externalUrl: string;
  /** URL immagine copertina (upload Blob o link esterno) */
  coverImageUrl: string;
  /** Categoria stelle (es. «4 stelle», «4 stelle superior») */
  starCategory: string;
  /** Valutazione interna agenzia 1–5 (0 = non valutata) */
  internalRating: number;
  /** Recensione / note interne agenzia */
  internalReview: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeanYouImportRowError {
  row: number;
  message: string;
}

export interface LeanYouImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: LeanYouImportRowError[];
}

export type ContactImportFieldKey =
  | "firstName"
  | "lastName"
  | "email"
  | "fiscalCode"
  | "organization"
  | "tags"
  | "notes"
  | "phones";

export type ContactImportFieldAction = "keep" | "overwrite" | "merge";

export interface ContactImportDraft {
  rowNumber: number;
  firstName: string;
  lastName: string;
  email: string;
  fiscalCode: string;
  organization: string;
  tags: string[];
  notes: string;
  phones: LeanYouContactPhone[];
}

export interface ContactImportFieldComparison {
  field: ContactImportFieldKey;
  label: string;
  existing: string;
  incoming: string;
  differs: boolean;
}

export interface ContactImportConflict {
  rowNumber: number;
  matchedBy: "email" | "fiscalCode";
  existingContactId: string;
  existing: ContactImportDraft;
  incoming: ContactImportDraft;
  fields: ContactImportFieldComparison[];
}

export interface ContactImportPreview {
  newRows: ContactImportDraft[];
  conflicts: ContactImportConflict[];
  errors: LeanYouImportRowError[];
}

export interface ContactImportConflictResolution {
  rowNumber: number;
  contactId: string;
  fields: Partial<Record<ContactImportFieldKey, ContactImportFieldAction>>;
}

export interface ContactImportApplyPayload {
  overwriteAll?: boolean;
  resolutions: ContactImportConflictResolution[];
}

/** Ruolo di un contatto rubrica su un singolo evento (multi-ruolo / multi-evento). */
export type LeonardoEventRoleCategory =
  | "partecipante"
  | "ospite"
  | "docente"
  | "relatore"
  | "segreteria_scientifica"
  | "pt"
  | "delegazione"
  | "sponsor"
  | "patrocinio"
  | "staff_interno"
  | "staff_esterno"
  /** @deprecated Migrato in staff_interno */
  | "staff";

export interface LeonardoEventContactAssignment {
  id: string;
  tenantId: string;
  eventId: string;
  contactId: string;
  roleCategory: LeonardoEventRoleCategory;
  notes: string;
  /** Preferenze hotel, transfer, allergie — per evento */
  hospitality?: LeonardoAssignmentHospitality;
  /** Adesioni a eventi correlati (cene, attività extra) */
  relatedParticipations?: LeonardoRelatedEventParticipation[];
  revision?: number;
  updatedBy?: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  purgeAfter?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeanYouNavItem {
  id: string;
  label: string;
  href?: string;
  segment?: string;
  module?: LeanYouModule;
  capability?: keyof LeanYouLeonardoCapabilities;
  icon?:
    | "dashboard"
    | "leonardo"
    | "events"
    | "contacts"
    | "finance"
    | "support"
    | "government"
    | "settings"
    | "locked";
  children?: LeanYouNavItem[];
}

export interface LeanYouPromptTemplate {
  slug: LeonardoMeetingType;
  name: string;
  systemPrompt: string;
}

export interface LeanYouConfig {
  productName: string;
  version?: string;
  leonardo: {
    title: string;
    subtitle: string;
    logo: string;
    meetingTypes: Array<{ value: LeonardoMeetingType; label: string }>;
    documentTypes: Array<{ id: string; label: string }>;
  };
  navigation: LeanYouNavItem[];
}
