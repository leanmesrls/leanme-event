export type LeanEventUserRole = "admin" | "member";

export type LeanEventModule = "leonardo" | "events" | "government";

export interface LeanEventLeonardoCapabilities {
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
  /** Sidebar — Lean.Studio (sviluppo personalizzato) */
  lean_human: boolean;
  /** @deprecated Rimosso dal catalogo moduli — tenuto per compatibilità tenant */
  government: boolean;
  /** Intelligence — Traduzioni AI */
  ai_translations: boolean;
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

export interface LeanEventUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: LeanEventUserRole;
  passwordHash: string;
  accessToken: string;
}

/** Utenza tenant esposta in UI (senza segreti). */
export type LeanEventTenantUserPublic = Pick<
  LeanEventUser,
  "id" | "email" | "firstName" | "lastName" | "name" | "role"
>;

export interface LeanEventTenant {
  id: string;
  name: string;
  slug: string;
  accessToken: string;
  modules: LeanEventModule[];
  /** showcase = piattaforma completa (demo); client = solo capability abilitate */
  profile?: "showcase" | "client";
  /** Preset named in data/lean-event/tenant-capability-presets.json */
  capabilityPreset?: string;
  leonardoCapabilities?: Partial<LeanEventLeonardoCapabilities>;
  users: LeanEventUser[];
}

export interface LeanEventTenantsFile {
  tenants: LeanEventTenant[];
}

export interface LeanEventSession {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: LeanEventUserRole;
  modules: LeanEventModule[];
  /** Risolto live da profile/preset — non usare snapshot JWT */
  tenantProfile?: "showcase" | "client";
  capabilityPreset?: string;
  leonardoCapabilitiesOverride?: Partial<LeanEventLeonardoCapabilities>;
  /** @deprecated Snapshot JWT al login — ignorato se presenti profile/preset; usato solo come fallback legacy */
  leonardoCapabilities?: LeanEventLeonardoCapabilities;
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
  /** Incrementa ad ogni salvataggio — optimistic locking multi-utente */
  revision?: number;
  updatedBy?: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  purgeAfter?: string | null;
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

/** Tipologia di evento formativo (congresso, tavola rotonda, corso, …). */
export type LeonardoFormationEventTypeId =
  | "congresso_simposio_conferenza_seminario"
  | "tavola_rotonda"
  | "conferenze_clinico_patologiche"
  | "consensus_meeting_interaziendali"
  | "corso_aggiornamento_tecnologico"
  | "corso_pratico_sviluppo_professionale"
  | "corso_pratico_organizzativo_gestionale"
  | "frequenza_clinica_tutore"
  | "corso_aggiornamento"
  | "corso_addestramento"
  | "tirocinio_frequenza_strutture"
  | "tirocinio_frequenza_tutoriale"
  | "corsi_percorsi_diagnostici_terapeutici"
  | "videoconferenza";

export type LeonardoEventStatus = "draft" | "active" | "completed" | "archived";

/** Sede evento strutturata (rubrica o testo libero — stessi campi). */
export interface LeonardoEventVenueDetails {
  name: string;
  address: string;
  city: string;
  /** Regione (IT) — usata se nazione Italia */
  region?: string;
  province: string;
  postalCode: string;
  /** Nazione (default Italia) */
  country?: string;
  /** Sede online (FAD / webinar) — al posto dell'indirizzo fisico */
  isOnline?: boolean;
  /** Link di riferimento (piattaforma / meeting) se sede online */
  onlineUrl?: string;
  /** Es. nome sala, piano, indicazioni aggiuntive */
  notes: string;
}

/** Persona in griglia ECM (segreteria / responsabile scientifico) — contactId opzionale. */
export interface LeonardoEcmGridPerson {
  contactId?: string | null;
  lastName: string;
  firstName: string;
  fiscalCode: string;
  phone?: string;
  mobile?: string;
  email?: string;
  qualification?: string;
}

export interface LeonardoEcmProfessionTarget {
  professionId: string;
  disciplineId: string;
  professionLabel?: string;
  disciplineLabel?: string;
}

/** Riga finanziamento/sponsor in griglia ECM (nome, modalità, importo). */
export interface LeonardoEcmGridSponsor {
  id: string;
  /** Collegamento a gestione sponsor evento (fase Sponsor). */
  eventSponsorId?: string | null;
  company: string;
  amount: string;
  modality: string;
}

/**
 * Griglia tecnica accreditamento ECM (modello MO7304 RES — base anche per altre modalità).
 * Campi tipologia evento / formazione restano su LeonardoEvent.
 */
export interface LeonardoEcmGrid {
  isCorporateTrainingProject: boolean | null;
  concernsInfantNutrition: boolean | null;
  effectiveDurationHours: number | null;
  effectiveDurationMinutes: number | null;
  formativeObjectiveCode: number | null;
  skillsTechnicalProfessional: string;
  skillsProcess: string;
  skillsSystem: string;
  workshopInsideCongress: boolean | null;
  interactiveResidentialTraining: boolean | null;
  interactiveDurationHours: number | null;
  /** @deprecated Non usato in UI — la compilazione è a carico della segreteria. */
  organizationalSecretary?: LeonardoEcmGridPerson;
  professionTargets: LeonardoEcmProfessionTarget[];
  /** Responsabili scientifici */
  scientificLeads: LeonardoEcmGridPerson[];
  /** Comitato scientifico (opzionale) */
  scientificCommittee?: LeonardoEcmGridPerson[];
  facultyRelevance: "nazionale" | "internazionale" | null;
  teachingMethodIds: string[];
  italianOnly: boolean | null;
  foreignLanguages: string;
  simultaneousTranslation: boolean | null;
  /** Se la partecipazione è a pagamento */
  participationPaid?: boolean | null;
  participationFee: string;
  expectedParticipants: number | null;
  onlineRegistration: boolean | null;
  directRecruitment: "si" | "no" | "parziale" | null;
  participantProvenance:
    | "locale"
    | "regionale"
    | "nazionale"
    | "internazionale"
    | null;
  presenceVerificationIds: string[];
  learningVerificationId: string | null;
  durableMaterial: string;
  isSponsored: boolean | null;
  otherFunding: boolean | null;
  sponsors: LeonardoEcmGridSponsor[];
  otherFundingEntries?: LeonardoEcmGridSponsor[];
  hasPartner: boolean | null;
  partners?: LeonardoEcmGridSponsor[];
  /** @deprecated Usare partners[] */
  partnerName?: string;
}

/** Gestione sponsor evento (fase L1 Sponsor — contratti/accordi). */
export interface LeonardoEventSponsorRecord {
  id: string;
  contactId?: string | null;
  companyName: string;
  contactName?: string;
  agreementSummary?: string;
  contractRef?: string;
  sponsorshipType?: string;
  amount?: string;
  notes?: string;
}

/** Sessione o pausa del programma scientifico. */
export interface LeonardoScientificProgramSession {
  id: string;
  kind: "session" | "break";
  /** Data giorno (gg/mm/aaaa o ISO) se evento multi-giorno */
  dayDate?: string;
  startTime: string;
  endTime: string;
  title: string;
  moderators: string;
  speakers: string;
  otherSpeakers: string;
}

export interface LeonardoScientificProgram {
  sessions: LeonardoScientificProgramSession[];
}

export interface LeonardoEvent {
  id: string;
  tenantId: string;
  createdBy: string;
  cdc: string;
  title: string;
  /** Snapshot testuale sede (da rubrica o libero) — compatibilità elenchi/export */
  venue: string;
  /** Rubrica sedi tenant — opzionale */
  venueId?: string | null;
  /** Campi sede strutturati (precompilati da rubrica o editabili a mano) */
  venueDetails?: LeonardoEventVenueDetails;
  startDate: string;
  endDate: string;
  /** Tipologia evento (anagrafica) */
  categoryId: LeonardoEventCategoryId;
  /** Solo per formazione sanitaria */
  healthAreaId: string | null;
  /** Solo per formazione sanitaria — null finché non risposto */
  ecmEnabled: boolean | null;
  /** Tipologia di formazione (RES/FAD/…) — formazione sanitaria e non sanitaria */
  ecmModality: LeonardoEcmModality | null;
  /**
   * Tipologia di evento formativo (congresso, tavola rotonda, corso, …).
   * Solo formazione sanitaria / non sanitaria.
   */
  formationEventTypeId?: LeonardoFormationEventTypeId | null;
  /** Struttura assistenziale/formativa — se richiesto dalla tipologia */
  formationStructureName?: string | null;
  /** Registrazione e quote iscrizione */
  registration?: LeonardoEventRegistration | null;
  /** Griglia tecnica ECM (MO7304 e affini) */
  ecmGrid?: LeonardoEcmGrid | null;
  /** Programma scientifico (sessioni / pause) */
  scientificProgram?: LeonardoScientificProgram | null;
  /** Anagrafica commerciale sponsor dell'evento (fase Sponsor) */
  eventSponsors?: LeonardoEventSponsorRecord[];
  /** @deprecated Usare categoryId + campi ECM */
  type?: LeonardoEventType;
  status: LeonardoEventStatus;
  notes: string;
  /** Preferito (stellina) — flag a livello evento/tenant */
  isFavorite?: boolean;
  /** Project Leader — una sola utenza tenant */
  projectLeaderUserId?: string | null;
  /** Project Manager — più utenze tenant */
  projectManagerUserIds?: string[];
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
  /** Percorsi interni LeanEvent citati nel messaggio */
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

export interface LeanEventContactPhone {
  label: string;
  number: string;
}

export interface LeanEventContactEmail {
  label: string;
  address: string;
}

/** Consenso privacy tracciato sull’anagrafica contatto. */
export interface LeanEventContactPrivacyConsent {
  /** Prefissati: data_processing, newsletter, marketing, third_party — oppure id custom */
  id: string;
  label: string;
  granted: boolean;
  grantedAt?: string | null;
}

export interface LeanEventContact {
  id: string;
  tenantId: string;
  /** Es. Egregio, Gentilissima */
  vocative?: string;
  /** Titolo professionale (Dottore, Prof., Ing., …) */
  honorificTitle?: string;
  firstName: string;
  lastName: string;
  /** Email primaria (allineata a emails[0] se presente) */
  email: string;
  /** Email aggiuntive (personale, istituzionale, segreteria, …) */
  emails?: LeanEventContactEmail[];
  /** Per area riservata partecipante (accesso multi-evento) */
  fiscalCode?: string;
  phones: LeanEventContactPhone[];
  /** Data di nascita (ISO yyyy-mm-dd o gg/mm/aaaa normalizzata) */
  birthDate?: string;
  /** Residenza */
  address?: string;
  city?: string;
  province?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  /** Ente / azienda */
  organization: string;
  organizationAddress?: string;
  organizationCity?: string;
  /** Provincia ente / azienda di appartenenza (sigla, es. BO) */
  organizationProvince?: string;
  organizationRegion?: string;
  organizationPostalCode?: string;
  organizationCountry?: string;
  /** Ruolo aziendale (lista aperta + custom) */
  organizationRole?: string;
  /** Etichette libere / categorie di appartenenza */
  tags: string[];
  /** Preferenze alimentari / intolleranze */
  dietaryNotes?: string;
  mobilityNotes?: string;
  /** Altre richieste personali */
  personalRequests?: string;
  /** Consensi privacy autorizzati */
  privacyConsents?: LeanEventContactPrivacyConsent[];
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
export interface LeanEventSupplier {
  id: string;
  tenantId: string;
  name: string;
  categoryId: LeonardoSupplierCategoryId;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  region?: string;
  postalCode?: string;
  country?: string;
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
  revision?: number;
  updatedBy?: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  purgeAfter?: string | null;
}

/** Thread chat evento (messaggi in payload; SoT Neon + Blob). */
export interface LeonardoEventChatThread {
  id: string;
  tenantId: string;
  eventId: string;
  messages: LeonardoEventChatMessage[];
  createdAt: string;
  updatedAt: string;
  revision?: number;
  updatedBy?: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  purgeAfter?: string | null;
}

/** Turno chat Lean.Agent.Teresa (assistenza workspace). */
export interface TeresaChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  /** Contesto UI al momento del messaggio (tab attiva). */
  contextLabel?: string;
  contextKind?: string;
  contextEntityId?: string;
}

/** Thread Teresa per utenza (più conversazioni possibili; max messaggi per thread). */
export interface TeresaChatThread {
  id: string;
  tenantId: string;
  userId: string;
  userEmail: string;
  userName: string;
  /** Titolo breve (prima domanda o “Nuova conversazione”). */
  title?: string;
  messages: TeresaChatMessage[];
  createdAt: string;
  updatedAt: string;
  revision?: number;
  updatedBy?: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  purgeAfter?: string | null;
}

/** Riepilogo thread per supervisione globale LeanMe (cross-tenant). */
export interface TeresaSuperviseThreadSummary {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  title: string | null;
  userId: string;
  userName: string;
  userEmail: string;
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  updatedAt: string;
  createdAt: string;
  lastUserPreview: string | null;
  lastAssistantPreview: string | null;
  lastContextLabel: string | null;
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
  region?: string;
  postalCode: string;
  country?: string;
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
  revision?: number;
  updatedBy?: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  purgeAfter?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeanEventImportRowError {
  row: number;
  message: string;
}

export interface LeanEventImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: LeanEventImportRowError[];
}

export type ContactImportFieldKey =
  | "vocative"
  | "honorificTitle"
  | "firstName"
  | "lastName"
  | "email"
  | "fiscalCode"
  | "organization"
  | "organizationRole"
  | "organizationAddress"
  | "organizationCity"
  | "organizationProvince"
  | "organizationRegion"
  | "organizationPostalCode"
  | "organizationCountry"
  | "address"
  | "city"
  | "province"
  | "region"
  | "postalCode"
  | "country"
  | "birthDate"
  | "dietaryNotes"
  | "mobilityNotes"
  | "personalRequests"
  | "tags"
  | "notes"
  | "phones"
  | "emails";

export type ContactImportFieldAction = "keep" | "overwrite" | "merge";

export interface ContactImportDraft {
  rowNumber: number;
  vocative: string;
  honorificTitle: string;
  firstName: string;
  lastName: string;
  email: string;
  emails: LeanEventContactEmail[];
  fiscalCode: string;
  birthDate: string;
  address: string;
  city: string;
  province: string;
  region: string;
  postalCode: string;
  country: string;
  organization: string;
  organizationAddress: string;
  organizationCity: string;
  organizationProvince: string;
  organizationRegion: string;
  organizationPostalCode: string;
  organizationCountry: string;
  organizationRole: string;
  dietaryNotes: string;
  mobilityNotes: string;
  personalRequests: string;
  tags: string[];
  notes: string;
  phones: LeanEventContactPhone[];
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
  errors: LeanEventImportRowError[];
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
  | "moderatore"
  | "chair"
  | "discussant"
  | "segreteria_scientifica"
  | "pt"
  | "delegazione"
  | "sponsor"
  | "patrocinio"
  | "staff_interno"
  | "staff_esterno"
  /** @deprecated Migrato in staff_interno */
  | "staff";

/** Voce di quota iscrizione (può cambiare avvicinandosi all'evento). */
export interface LeonardoEventRegistrationFee {
  id: string;
  /** Es. Specializzandi, Medici, Under 40 */
  label: string;
  amount: string;
  /** Inizio validità quota (gg/mm/aaaa o ISO) */
  validFrom: string;
  /** Fine validità quota */
  validTo: string;
  notes?: string;
}

/** Registrazione / quote iscrizione evento (scheda tecnica › Registrazione). */
export interface LeonardoEventRegistration {
  paid: boolean | null;
  fees: LeonardoEventRegistrationFee[];
  refundsEnabled: boolean | null;
  refundRules: string;
}

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

export interface LeanEventNavItem {
  id: string;
  label: string;
  href?: string;
  segment?: string;
  module?: LeanEventModule;
  capability?: keyof LeanEventLeonardoCapabilities;
  /** Solo operatori piattaforma LeanMe (es. supervisione Teresa) */
  platformOperatorOnly?: boolean;
  /** Intestazione di gruppo in sidebar (Starter / Pro / Intelligence) */
  navGroup?: boolean;
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
  children?: LeanEventNavItem[];
}

export interface LeanEventPromptTemplate {
  slug: LeonardoMeetingType;
  name: string;
  systemPrompt: string;
}

export interface LeanEventConfig {
  productName: string;
  version?: string;
  leonardo: {
    title: string;
    subtitle: string;
    logo: string;
    meetingTypes: Array<{ value: LeonardoMeetingType; label: string }>;
    documentTypes: Array<{ id: string; label: string }>;
  };
  navigation: LeanEventNavItem[];
}
