/**
 * Letture da tabelle tipizzate → shape domain (types/lean-event).
 * Abilitate con LEAN_EVENT_READ_NORMALIZED=1.
 */

import type { LeanEventManagedEntityType } from "@/lib/lean-event/entity-lifecycle";
import {
  getLeanEventSql,
  isLeanEventDatabaseEnabled,
} from "@/lib/lean-event/db";
import { isLeanEventReadNormalized } from "@/lib/lean-event/normalized-flags";
import type {
  LeanEventContact,
  LeanEventSupplier,
  LeonardoAssignmentHospitality,
  TenantEvent,
  LeonardoEventChatThread,
  LeonardoEventContactAssignment,
  TenantEventHotelBlock,
  LeonardoEventSupplierLink,
  LeonardoVenue,
  LeonardoWorkspace,
  TeresaChatThread,
} from "@/types/lean-event";

type NeonReadResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "disabled" | "error" };

type Sql = NonNullable<ReturnType<typeof getLeanEventSql>>;

function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value) return value;
  return new Date().toISOString();
}

function isoOrNull(value: unknown): string | null {
  if (value == null) return null;
  return iso(value);
}

function str(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  return String(value);
}

async function withSql<T>(
  run: (sql: Sql) => Promise<T>
): Promise<NeonReadResult<T>> {
  if (!isLeanEventDatabaseEnabled() || !isLeanEventReadNormalized()) {
    return { ok: false, reason: "disabled" };
  }
  const sql = getLeanEventSql();
  if (!sql) return { ok: false, reason: "disabled" };
  try {
    return { ok: true, data: await run(sql) };
  } catch (error) {
    console.error(
      JSON.stringify({
        lean_event_normalized_read_error: {
          message: error instanceof Error ? error.message : String(error),
        },
      })
    );
    return { ok: false, reason: "error" };
  }
}

export async function listNormalizedEntities<T>(
  tenantId: string,
  entityType: LeanEventManagedEntityType
): Promise<NeonReadResult<T[]>> {
  return withSql(async (sql) => {
    switch (entityType) {
      case "venue":
        return (await listVenues(sql, tenantId)) as T[];
      case "contact":
        return (await listContacts(sql, tenantId)) as T[];
      case "supplier":
        return (await listSuppliers(sql, tenantId)) as T[];
      case "event":
        return (await listEvents(sql, tenantId)) as T[];
      case "assignment":
        return (await listAssignments(sql, tenantId)) as T[];
      case "event_supplier_link":
        return (await listSupplierLinks(sql, tenantId)) as T[];
      case "workspace":
        return (await listWorkspaces(sql, tenantId)) as T[];
      case "event_chat":
        return (await listEventChats(sql, tenantId)) as T[];
      case "teresa_chat":
        return (await listTeresa(sql, tenantId)) as T[];
      default:
        return [];
    }
  });
}

export async function getNormalizedEntity<T>(
  tenantId: string,
  entityType: LeanEventManagedEntityType,
  entityId: string
): Promise<NeonReadResult<T | null>> {
  return withSql(async (sql) => {
    switch (entityType) {
      case "venue": {
        const rows = await listVenues(sql, tenantId, entityId);
        return (rows[0] ?? null) as T | null;
      }
      case "contact": {
        const rows = await listContacts(sql, tenantId, entityId);
        return (rows[0] ?? null) as T | null;
      }
      case "supplier": {
        const rows = await listSuppliers(sql, tenantId, entityId);
        return (rows[0] ?? null) as T | null;
      }
      case "event": {
        const rows = await listEvents(sql, tenantId, entityId);
        return (rows[0] ?? null) as T | null;
      }
      case "assignment": {
        const rows = await listAssignments(sql, tenantId, entityId);
        return (rows[0] ?? null) as T | null;
      }
      case "event_supplier_link": {
        const rows = await listSupplierLinks(sql, tenantId, entityId);
        return (rows[0] ?? null) as T | null;
      }
      case "workspace": {
        const rows = await listWorkspaces(sql, tenantId, entityId);
        return (rows[0] ?? null) as T | null;
      }
      case "event_chat": {
        const rows = await listEventChats(sql, tenantId, entityId);
        return (rows[0] ?? null) as T | null;
      }
      case "teresa_chat": {
        const rows = await listTeresa(sql, tenantId, entityId);
        return (rows[0] ?? null) as T | null;
      }
      default:
        return null;
    }
  });
}

export async function listNormalizedByFk<T>(
  tenantId: string,
  entityType: "assignment" | "event_supplier_link",
  fk: "eventId" | "contactId" | "supplierId",
  value: string
): Promise<NeonReadResult<T[]>> {
  return withSql(async (sql) => {
    if (entityType === "assignment" && fk === "eventId") {
      const rows = await sql`
        SELECT id FROM lean_event_assignments
        WHERE tenant_id = ${tenantId} AND event_id = ${value} AND deleted_at IS NULL
        ORDER BY updated_at DESC
      `;
      const all = await listAssignments(sql, tenantId);
      const ids = new Set(rows.map((r) => String(r.id)));
      return all.filter((a) => ids.has(a.id)) as T[];
    }
    if (entityType === "assignment" && fk === "contactId") {
      const rows = await sql`
        SELECT id FROM lean_event_assignments
        WHERE tenant_id = ${tenantId} AND contact_id = ${value} AND deleted_at IS NULL
        ORDER BY updated_at DESC
      `;
      const all = await listAssignments(sql, tenantId);
      const ids = new Set(rows.map((r) => String(r.id)));
      return all.filter((a) => ids.has(a.id)) as T[];
    }
    if (entityType === "event_supplier_link" && fk === "eventId") {
      const rows = await sql`
        SELECT id FROM lean_event_event_supplier_links
        WHERE tenant_id = ${tenantId} AND event_id = ${value} AND deleted_at IS NULL
        ORDER BY updated_at DESC
      `;
      const all = await listSupplierLinks(sql, tenantId);
      const ids = new Set(rows.map((r) => String(r.id)));
      return all.filter((a) => ids.has(a.id)) as T[];
    }
    return [];
  });
}

async function listVenues(
  sql: Sql,
  tenantId: string,
  onlyId?: string
): Promise<LeonardoVenue[]> {
  const rows = onlyId
    ? await sql`
        SELECT * FROM lean_event_venues
        WHERE tenant_id = ${tenantId} AND id = ${onlyId}
      `
    : await sql`
        SELECT * FROM lean_event_venues
        WHERE tenant_id = ${tenantId}
        ORDER BY updated_at DESC
      `;
  return rows.map((r) => ({
    id: str(r.id),
    tenantId: str(r.tenant_id),
    name: str(r.name),
    address: str(r.address),
    city: str(r.city),
    province: str(r.province),
    region: r.region != null ? str(r.region) : undefined,
    postalCode: str(r.postal_code),
    country: r.country != null ? str(r.country) : undefined,
    phone: str(r.phone),
    email: str(r.email),
    website: str(r.website),
    externalUrl: str(r.external_url),
    coverImageUrl: str(r.cover_image_url),
    starCategory: str(r.star_category),
    internalRating: Number(r.internal_rating) || 0,
    internalReview: str(r.internal_review),
    notes: str(r.notes),
    revision: Number(r.revision) || 1,
    updatedBy: r.updated_by != null ? str(r.updated_by) : undefined,
    deletedAt: isoOrNull(r.deleted_at),
    deletedBy: r.deleted_by != null ? str(r.deleted_by) : undefined,
    purgeAfter: isoOrNull(r.purge_after),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  }));
}

async function listContacts(
  sql: Sql,
  tenantId: string,
  onlyId?: string
): Promise<LeanEventContact[]> {
  const rows = onlyId
    ? await sql`
        SELECT * FROM lean_event_contacts
        WHERE tenant_id = ${tenantId} AND id = ${onlyId}
      `
    : await sql`
        SELECT * FROM lean_event_contacts
        WHERE tenant_id = ${tenantId}
        ORDER BY updated_at DESC
      `;

  const result: LeanEventContact[] = [];
  for (const r of rows) {
    const id = str(r.id);
    const emails = await sql`
      SELECT * FROM lean_event_contact_emails
      WHERE tenant_id = ${tenantId} AND contact_id = ${id}
      ORDER BY sort_order
    `;
    const phones = await sql`
      SELECT * FROM lean_event_contact_phones
      WHERE tenant_id = ${tenantId} AND contact_id = ${id}
      ORDER BY sort_order
    `;
    const tags = await sql`
      SELECT tag FROM lean_event_contact_tags
      WHERE tenant_id = ${tenantId} AND contact_id = ${id}
    `;
    const consents = await sql`
      SELECT * FROM lean_event_contact_privacy_consents
      WHERE tenant_id = ${tenantId} AND contact_id = ${id}
    `;
    result.push({
      id,
      tenantId: str(r.tenant_id),
      vocative: r.vocative != null ? str(r.vocative) : undefined,
      honorificTitle: r.honorific_title != null ? str(r.honorific_title) : undefined,
      firstName: str(r.first_name),
      lastName: str(r.last_name),
      email: str(r.email),
      emails: emails.map((e) => ({
        label: str(e.label),
        address: str(e.address),
      })),
      fiscalCode: r.fiscal_code != null ? str(r.fiscal_code) : undefined,
      phones: phones.map((p) => ({
        label: str(p.label),
        number: str(p.number),
      })),
      birthDate: r.birth_date != null ? str(r.birth_date) : undefined,
      address: r.address != null ? str(r.address) : undefined,
      city: r.city != null ? str(r.city) : undefined,
      province: r.province != null ? str(r.province) : undefined,
      region: r.region != null ? str(r.region) : undefined,
      postalCode: r.postal_code != null ? str(r.postal_code) : undefined,
      country: r.country != null ? str(r.country) : undefined,
      organization: str(r.organization),
      organizationAddress:
        r.organization_address != null ? str(r.organization_address) : undefined,
      organizationCity:
        r.organization_city != null ? str(r.organization_city) : undefined,
      organizationProvince:
        r.organization_province != null ? str(r.organization_province) : undefined,
      organizationRegion:
        r.organization_region != null ? str(r.organization_region) : undefined,
      organizationPostalCode:
        r.organization_postal_code != null
          ? str(r.organization_postal_code)
          : undefined,
      organizationCountry:
        r.organization_country != null ? str(r.organization_country) : undefined,
      organizationRole:
        r.organization_role != null ? str(r.organization_role) : undefined,
      tags: tags.map((t) => str(t.tag)),
      dietaryNotes: r.dietary_notes != null ? str(r.dietary_notes) : undefined,
      mobilityNotes: r.mobility_notes != null ? str(r.mobility_notes) : undefined,
      personalRequests:
        r.personal_requests != null ? str(r.personal_requests) : undefined,
      privacyConsents: consents.map((c) => ({
        id: str(c.id),
        label: str(c.label),
        granted: Boolean(c.granted),
        grantedAt: c.granted_at != null ? str(c.granted_at) : null,
      })),
      notes: str(r.notes),
      revision: Number(r.revision) || 1,
      updatedBy: r.updated_by != null ? str(r.updated_by) : undefined,
      deletedAt: isoOrNull(r.deleted_at),
      deletedBy: r.deleted_by != null ? str(r.deleted_by) : undefined,
      purgeAfter: isoOrNull(r.purge_after),
      createdAt: iso(r.created_at),
      updatedAt: iso(r.updated_at),
    });
  }
  return result;
}

async function listSuppliers(
  sql: Sql,
  tenantId: string,
  onlyId?: string
): Promise<LeanEventSupplier[]> {
  const rows = onlyId
    ? await sql`
        SELECT * FROM lean_event_suppliers
        WHERE tenant_id = ${tenantId} AND id = ${onlyId}
      `
    : await sql`
        SELECT * FROM lean_event_suppliers
        WHERE tenant_id = ${tenantId}
        ORDER BY updated_at DESC
      `;
  const result: LeanEventSupplier[] = [];
  for (const r of rows) {
    const id = str(r.id);
    const agreements = await sql`
      SELECT * FROM lean_event_supplier_agreements
      WHERE tenant_id = ${tenantId} AND supplier_id = ${id}
      ORDER BY created_at
    `;
    result.push({
      id,
      tenantId: str(r.tenant_id),
      name: str(r.name),
      categoryId: str(r.category_id) as LeanEventSupplier["categoryId"],
      email: str(r.email),
      phone: str(r.phone),
      address: str(r.address),
      city: str(r.city),
      province: str(r.province),
      region: r.region != null ? str(r.region) : undefined,
      postalCode: r.postal_code != null ? str(r.postal_code) : undefined,
      country: r.country != null ? str(r.country) : undefined,
      vatNumber: str(r.vat_number),
      contactPerson: str(r.contact_person),
      notes: str(r.notes),
      agreements: agreements.map((d) => ({
        id: str(d.id),
        title: str(d.title),
        kind: str(d.kind) as LeanEventSupplier["agreements"][number]["kind"],
        documentDate: str(d.document_date),
        fileName: str(d.file_name),
        fileUrl: str(d.file_url),
        mimeType: str(d.mime_type),
        sizeBytes: Number(d.size_bytes) || 0,
        notes: str(d.notes),
        uploadedBy: str(d.uploaded_by),
        createdAt: iso(d.created_at),
      })),
      revision: Number(r.revision) || 1,
      updatedBy: r.updated_by != null ? str(r.updated_by) : undefined,
      deletedAt: isoOrNull(r.deleted_at),
      deletedBy: r.deleted_by != null ? str(r.deleted_by) : undefined,
      purgeAfter: isoOrNull(r.purge_after),
      createdAt: iso(r.created_at),
      updatedAt: iso(r.updated_at),
    });
  }
  return result;
}

async function hydrateHotelBlocks(
  sql: Sql,
  tenantId: string,
  eventId: string
): Promise<TenantEventHotelBlock[]> {
  const blocks = await sql`
    SELECT * FROM lean_event_event_hotel_blocks
    WHERE tenant_id = ${tenantId} AND event_id = ${eventId}
    ORDER BY sort_order
  `;
  const result: TenantEventHotelBlock[] = [];
  for (const b of blocks) {
    const blockId = str(b.id);
    const nights = await sql`
      SELECT * FROM lean_event_event_night_allotments
      WHERE tenant_id = ${tenantId} AND event_id = ${eventId} AND hotel_block_id = ${blockId}
      ORDER BY sort_order
    `;
    const nightAllotments = [];
    for (const n of nights) {
      const nightId = str(n.id);
      const rooms = await sql`
        SELECT * FROM lean_event_event_room_allotments
        WHERE tenant_id = ${tenantId} AND event_id = ${eventId}
          AND hotel_block_id = ${blockId} AND night_allotment_id = ${nightId}
        ORDER BY sort_order
      `;
      nightAllotments.push({
        id: nightId,
        nightDate: str(n.night_date),
        roomAllotments: rooms.map((room) => ({
          id: str(room.id),
          code: str(room.code),
          label: str(room.label),
          quantity: Number(room.quantity) || 0,
        })),
      });
    }
    result.push({
      id: blockId,
      venueId: str(b.venue_id),
      checkInDate: str(b.check_in_date),
      checkOutDate: str(b.check_out_date),
      nightAllotments,
      notes: str(b.notes),
    });
  }
  return result;
}

async function listEvents(
  sql: Sql,
  tenantId: string,
  onlyId?: string
): Promise<TenantEvent[]> {
  const rows = onlyId
    ? await sql`
        SELECT * FROM lean_event_events
        WHERE tenant_id = ${tenantId} AND id = ${onlyId}
      `
    : await sql`
        SELECT * FROM lean_event_events
        WHERE tenant_id = ${tenantId}
        ORDER BY updated_at DESC
      `;

  const result: TenantEvent[] = [];
  for (const r of rows) {
    const id = str(r.id);
    const pms = await sql`
      SELECT user_id FROM lean_event_event_project_managers
      WHERE tenant_id = ${tenantId} AND event_id = ${id}
    `;
    const fees = await sql`
      SELECT * FROM lean_event_event_registration_fees
      WHERE tenant_id = ${tenantId} AND event_id = ${id}
      ORDER BY sort_order
    `;
    const sponsors = await sql`
      SELECT * FROM lean_event_event_sponsors
      WHERE tenant_id = ${tenantId} AND event_id = ${id}
    `;
    const related = await sql`
      SELECT * FROM lean_event_event_related
      WHERE tenant_id = ${tenantId} AND event_id = ${id}
    `;
    const sessions = await sql`
      SELECT * FROM lean_event_event_program_sessions
      WHERE tenant_id = ${tenantId} AND event_id = ${id}
      ORDER BY sort_order
    `;
    const ecmRows = await sql`
      SELECT * FROM lean_event_event_ecm_grids
      WHERE tenant_id = ${tenantId} AND event_id = ${id}
      LIMIT 1
    `;
    const hotelBlocks = await hydrateHotelBlocks(sql, tenantId, id);

    let ecmGrid: TenantEvent["ecmGrid"] = null;
    if (ecmRows[0]) {
      const g = ecmRows[0];
      const targets = await sql`
        SELECT * FROM lean_event_event_ecm_profession_targets
        WHERE tenant_id = ${tenantId} AND event_id = ${id}
        ORDER BY sort_order
      `;
      const people = await sql`
        SELECT * FROM lean_event_event_ecm_people
        WHERE tenant_id = ${tenantId} AND event_id = ${id}
        ORDER BY sort_order
      `;
      const stringIds = await sql`
        SELECT * FROM lean_event_event_ecm_string_ids
        WHERE tenant_id = ${tenantId} AND event_id = ${id}
        ORDER BY sort_order
      `;
      const ecmSponsors = await sql`
        SELECT * FROM lean_event_event_ecm_sponsors
        WHERE tenant_id = ${tenantId} AND event_id = ${id}
        ORDER BY sort_order
      `;
      ecmGrid = {
        isCorporateTrainingProject:
          g.is_corporate_training_project as boolean | null,
        concernsInfantNutrition: g.concerns_infant_nutrition as boolean | null,
        effectiveDurationHours: g.effective_duration_hours as number | null,
        effectiveDurationMinutes: g.effective_duration_minutes as number | null,
        formativeObjectiveCode: g.formative_objective_code as number | null,
        skillsTechnicalProfessional: str(g.skills_technical_professional),
        skillsProcess: str(g.skills_process),
        skillsSystem: str(g.skills_system),
        workshopInsideCongress: g.workshop_inside_congress as boolean | null,
        interactiveResidentialTraining:
          g.interactive_residential_training as boolean | null,
        interactiveDurationHours: g.interactive_duration_hours as number | null,
        professionTargets: targets.map((t) => ({
          professionId: str(t.profession),
          disciplineId: str(t.discipline),
        })),
        scientificLeads: people
          .filter((p) => str(p.role) === "scientific_lead")
          .map((p) => ({
            contactId: p.contact_id != null ? str(p.contact_id) : null,
            lastName: str(p.last_name),
            firstName: str(p.first_name),
            fiscalCode: str(p.fiscal_code),
            phone: p.phone != null ? str(p.phone) : undefined,
            mobile: p.mobile != null ? str(p.mobile) : undefined,
            email: p.email != null ? str(p.email) : undefined,
            qualification:
              p.qualification != null ? str(p.qualification) : undefined,
          })),
        scientificCommittee: people
          .filter((p) => str(p.role) === "scientific_committee")
          .map((p) => ({
            contactId: p.contact_id != null ? str(p.contact_id) : null,
            lastName: str(p.last_name),
            firstName: str(p.first_name),
            fiscalCode: str(p.fiscal_code),
            phone: p.phone != null ? str(p.phone) : undefined,
            mobile: p.mobile != null ? str(p.mobile) : undefined,
            email: p.email != null ? str(p.email) : undefined,
            qualification:
              p.qualification != null ? str(p.qualification) : undefined,
          })),
        facultyRelevance: (g.faculty_relevance as "nazionale" | "internazionale" | null) ?? null,
        teachingMethodIds: stringIds
          .filter((s) => str(s.kind) === "teaching_method")
          .map((s) => str(s.value)),
        italianOnly: g.italian_only as boolean | null,
        foreignLanguages: str(g.foreign_languages),
        simultaneousTranslation: g.simultaneous_translation as boolean | null,
        participationPaid: g.participation_paid as boolean | null,
        participationFee: str(g.participation_fee),
        expectedParticipants: g.expected_participants as number | null,
        onlineRegistration: g.online_registration as boolean | null,
        directRecruitment: (g.direct_recruitment as
          | "si"
          | "no"
          | "parziale"
          | null) ?? null,
        participantProvenance: (g.participant_provenance as
          | "locale"
          | "regionale"
          | "nazionale"
          | "internazionale"
          | null) ?? null,
        presenceVerificationIds: stringIds
          .filter((s) => str(s.kind) === "presence_verification")
          .map((s) => str(s.value)),
        learningVerificationId:
          g.learning_verification_id != null
            ? str(g.learning_verification_id)
            : null,
        durableMaterial: str(g.durable_material),
        isSponsored: g.is_sponsored as boolean | null,
        otherFunding: g.other_funding as boolean | null,
        sponsors: ecmSponsors
          .filter((s) => str(s.kind) === "sponsor")
          .map((s) => ({
            id: str(s.id),
            company: str(s.company),
            amount: str(s.amount),
            modality: str(s.modality),
          })),
        otherFundingEntries: ecmSponsors
          .filter((s) => str(s.kind) === "other_funding")
          .map((s) => ({
            id: str(s.id),
            company: str(s.company),
            amount: str(s.amount),
            modality: str(s.modality),
          })),
        hasPartner: g.has_partner as boolean | null,
        partners: ecmSponsors
          .filter((s) => str(s.kind) === "partner")
          .map((s) => ({
            id: str(s.id),
            company: str(s.company),
            amount: str(s.amount),
            modality: str(s.modality),
          })),
      };
    }

    result.push({
      id,
      tenantId: str(r.tenant_id),
      createdBy: str(r.created_by),
      cdc: str(r.cdc),
      title: str(r.title),
      venue: str(r.venue),
      venueId: r.venue_id != null ? str(r.venue_id) : null,
      venueDetails:
        r.venue_name != null || r.venue_city != null
          ? {
              name: str(r.venue_name),
              address: str(r.venue_address),
              city: str(r.venue_city),
              province: str(r.venue_province),
              region: r.venue_region != null ? str(r.venue_region) : undefined,
              postalCode: str(r.venue_postal_code),
              country: r.venue_country != null ? str(r.venue_country) : undefined,
              isOnline: Boolean(r.venue_is_online),
              onlineUrl:
                r.venue_online_url != null ? str(r.venue_online_url) : undefined,
              notes: str(r.venue_notes),
            }
          : undefined,
      startDate: str(r.start_date),
      endDate: str(r.end_date),
      categoryId: str(r.category_id) as TenantEvent["categoryId"],
      healthAreaId: r.health_area_id != null ? str(r.health_area_id) : null,
      ecmEnabled:
        r.ecm_enabled === null || r.ecm_enabled === undefined
          ? null
          : Boolean(r.ecm_enabled),
      ecmModality: (r.ecm_modality as TenantEvent["ecmModality"]) ?? null,
      formationEventTypeId:
        (r.formation_event_type_id as TenantEvent["formationEventTypeId"]) ??
        null,
      formationStructureName:
        r.formation_structure_name != null
          ? str(r.formation_structure_name)
          : null,
      registration: {
        paid:
          r.registration_paid === null || r.registration_paid === undefined
            ? null
            : Boolean(r.registration_paid),
        fees: fees.map((f) => ({
          id: str(f.id),
          label: str(f.label),
          amount: str(f.amount),
          validFrom: str(f.valid_from),
          validTo: str(f.valid_to),
          notes: f.notes != null ? str(f.notes) : undefined,
        })),
        refundsEnabled:
          r.registration_refunds_enabled === null ||
          r.registration_refunds_enabled === undefined
            ? null
            : Boolean(r.registration_refunds_enabled),
        refundRules: str(r.registration_refund_rules),
      },
      ecmGrid,
      scientificProgram: {
        sessions: sessions.map((s) => ({
          id: str(s.id),
          kind: str(s.kind) as "session" | "break",
          dayDate: s.day_date != null ? str(s.day_date) : undefined,
          startTime: str(s.start_time),
          endTime: str(s.end_time),
          title: str(s.title),
          moderators: str(s.moderators),
          speakers: str(s.speakers),
          otherSpeakers: str(s.other_speakers),
        })),
      },
      eventSponsors: sponsors.map((s) => ({
        id: str(s.id),
        contactId: s.contact_id != null ? str(s.contact_id) : null,
        companyName: str(s.company_name),
        contactName: s.contact_name != null ? str(s.contact_name) : undefined,
        agreementSummary:
          s.agreement_summary != null ? str(s.agreement_summary) : undefined,
        contractRef: s.contract_ref != null ? str(s.contract_ref) : undefined,
        sponsorshipType:
          s.sponsorship_type != null ? str(s.sponsorship_type) : undefined,
        amount: s.amount != null ? str(s.amount) : undefined,
        notes: s.notes != null ? str(s.notes) : undefined,
      })),
      type: (r.legacy_type as TenantEvent["type"]) ?? undefined,
      status: str(r.status) as TenantEvent["status"],
      notes: str(r.notes),
      isFavorite: Boolean(r.is_favorite),
      projectLeaderUserId:
        r.project_leader_user_id != null ? str(r.project_leader_user_id) : null,
      projectManagerUserIds: pms.map((p) => str(p.user_id)),
      hotelBlocks,
      relatedEvents: related.map((rel) => ({
        id: str(rel.id),
        kind: str(rel.kind) as NonNullable<TenantEvent["relatedEvents"]>[number]["kind"],
        title: str(rel.title),
        startsAt: str(rel.starts_at),
        endsAt: str(rel.ends_at),
        venue: str(rel.venue),
        venueId: rel.venue_id != null ? str(rel.venue_id) : null,
        notes: str(rel.notes),
        companionsAllowed: Boolean(rel.companions_allowed),
        maxCompanionsPerGuest: Number(rel.max_companions_per_guest) || 0,
      })),
      revision: Number(r.revision) || 1,
      updatedBy: r.updated_by != null ? str(r.updated_by) : undefined,
      deletedAt: isoOrNull(r.deleted_at),
      deletedBy: r.deleted_by != null ? str(r.deleted_by) : undefined,
      purgeAfter: isoOrNull(r.purge_after),
      createdAt: iso(r.created_at),
      updatedAt: iso(r.updated_at),
    });
  }
  return result;
}

async function hydrateHospitality(
  sql: Sql,
  tenantId: string,
  assignmentId: string
): Promise<LeonardoAssignmentHospitality | undefined> {
  const rows = await sql`
    SELECT * FROM lean_event_assignment_hospitality
    WHERE tenant_id = ${tenantId} AND assignment_id = ${assignmentId}
    LIMIT 1
  `;
  const h = rows[0];
  if (!h) return undefined;
  const stays = await sql`
    SELECT * FROM lean_event_assignment_night_stays
    WHERE tenant_id = ${tenantId} AND assignment_id = ${assignmentId}
  `;
  const travels = await sql`
    SELECT * FROM lean_event_assignment_travels
    WHERE tenant_id = ${tenantId} AND assignment_id = ${assignmentId}
    ORDER BY sort_order
  `;
  return {
    status: str(h.status, "pending") as LeonardoAssignmentHospitality["status"],
    hotelBlockId: str(h.hotel_block_id),
    nightAllotmentId: str(h.night_allotment_id),
    roomAllotmentId: str(h.room_allotment_id),
    roomTypeCode: str(h.room_type_code),
    checkIn: str(h.check_in),
    checkOut: str(h.check_out),
    nightStays: stays.map((s) => ({
      id: str(s.id),
      nightDate: str(s.night_date),
      hotelBlockId: str(s.hotel_block_id),
      nightAllotmentId: str(s.night_allotment_id),
      roomAllotmentId: str(s.room_allotment_id),
      roomTypeCode: str(s.room_type_code),
    })),
    roommateContactId:
      h.roommate_contact_id != null ? str(h.roommate_contact_id) : null,
    roommateFirstName: str(h.roommate_first_name),
    roommateLastName: str(h.roommate_last_name),
    roommatePhone: str(h.roommate_phone),
    roommateEmail: str(h.roommate_email),
    roommateName: str(h.roommate_name),
    roommateRole:
      (h.roommate_role as LeonardoAssignmentHospitality["roommateRole"]) ?? null,
    transferIn: Boolean(h.transfer_in),
    transferOut: Boolean(h.transfer_out),
    transferInMinutesAfter: Number(h.transfer_in_minutes_after) || 0,
    transferOutMinutesBefore: Number(h.transfer_out_minutes_before) || 0,
    transferInTime: str(h.transfer_in_time),
    transferInTimeManual: Boolean(h.transfer_in_time_manual),
    transferOutTime: str(h.transfer_out_time),
    transferOutTimeManual: Boolean(h.transfer_out_time_manual),
    transferNotes: str(h.transfer_notes),
    dietaryRequirements: str(h.dietary_requirements),
    allergies: str(h.allergies),
    accessibilityNotes: str(h.accessibility_notes),
    internalNotes: str(h.internal_notes),
    travels: travels.map((t) => ({
      id: str(t.id),
      direction: str(t.direction) as "outbound" | "return",
      mode: str(t.mode) as LeonardoAssignmentHospitality["travels"][number]["mode"],
      carrier: str(t.carrier),
      loyaltyProgram: str(t.loyalty_program),
      loyaltyCode: str(t.loyalty_code),
      originCity: str(t.origin_city),
      originAirport: str(t.origin_airport),
      destinationCity: str(t.destination_city),
      destinationAirport: str(t.destination_airport),
      departureAt: str(t.departure_at),
      arrivalAt: str(t.arrival_at),
      documentUrl: str(t.document_url),
      documentFrontUrl: str(t.document_front_url),
      documentBackUrl: str(t.document_back_url),
      notes: str(t.notes),
    })),
  };
}

async function listAssignments(
  sql: Sql,
  tenantId: string,
  onlyId?: string
): Promise<LeonardoEventContactAssignment[]> {
  const rows = onlyId
    ? await sql`
        SELECT * FROM lean_event_assignments
        WHERE tenant_id = ${tenantId} AND id = ${onlyId}
      `
    : await sql`
        SELECT * FROM lean_event_assignments
        WHERE tenant_id = ${tenantId}
        ORDER BY updated_at DESC
      `;
  const result: LeonardoEventContactAssignment[] = [];
  for (const r of rows) {
    const id = str(r.id);
    const hospitality = await hydrateHospitality(sql, tenantId, id);
    const parts = await sql`
      SELECT * FROM lean_event_assignment_related_participations
      WHERE tenant_id = ${tenantId} AND assignment_id = ${id}
    `;
    const relatedParticipations = [];
    for (const part of parts) {
      const companions = await sql`
        SELECT * FROM lean_event_assignment_related_companions
        WHERE tenant_id = ${tenantId} AND assignment_id = ${id}
          AND related_event_id = ${str(part.related_event_id)}
        ORDER BY sort_order
      `;
      relatedParticipations.push({
        relatedEventId: str(part.related_event_id),
        status: str(part.status) as "pending" | "confirmed" | "declined",
        notes: str(part.notes),
        companions: companions.map((c) => ({
          contactId: c.contact_id != null ? str(c.contact_id) : null,
          firstName: str(c.first_name),
          lastName: str(c.last_name),
          phone: str(c.phone),
          email: str(c.email),
        })),
      });
    }
    result.push({
      id,
      tenantId: str(r.tenant_id),
      eventId: str(r.event_id),
      contactId: str(r.contact_id),
      roleCategory: str(r.role_category) as LeonardoEventContactAssignment["roleCategory"],
      notes: str(r.notes),
      hospitality,
      relatedParticipations,
      revision: Number(r.revision) || 1,
      updatedBy: r.updated_by != null ? str(r.updated_by) : undefined,
      deletedAt: isoOrNull(r.deleted_at),
      deletedBy: r.deleted_by != null ? str(r.deleted_by) : undefined,
      purgeAfter: isoOrNull(r.purge_after),
      createdAt: iso(r.created_at),
      updatedAt: iso(r.updated_at),
    });
  }
  return result;
}

async function listSupplierLinks(
  sql: Sql,
  tenantId: string,
  onlyId?: string
): Promise<LeonardoEventSupplierLink[]> {
  const rows = onlyId
    ? await sql`
        SELECT * FROM lean_event_event_supplier_links
        WHERE tenant_id = ${tenantId} AND id = ${onlyId}
      `
    : await sql`
        SELECT * FROM lean_event_event_supplier_links
        WHERE tenant_id = ${tenantId}
        ORDER BY updated_at DESC
      `;
  const result: LeonardoEventSupplierLink[] = [];
  for (const r of rows) {
    const id = str(r.id);
    const documents = await sql`
      SELECT * FROM lean_event_event_supplier_documents
      WHERE tenant_id = ${tenantId} AND link_id = ${id}
    `;
    const emails = await sql`
      SELECT * FROM lean_event_event_supplier_emails
      WHERE tenant_id = ${tenantId} AND link_id = ${id}
    `;
    result.push({
      id,
      tenantId: str(r.tenant_id),
      eventId: str(r.event_id),
      supplierId: str(r.supplier_id),
      categoryId: str(r.category_id) as LeonardoEventSupplierLink["categoryId"],
      roleNotes: str(r.role_notes),
      documents: documents.map((d) => ({
        id: str(d.id),
        title: str(d.title),
        kind: str(d.kind) as LeonardoEventSupplierLink["documents"][number]["kind"],
        documentDate: str(d.document_date),
        fileName: str(d.file_name),
        fileUrl: str(d.file_url),
        mimeType: str(d.mime_type),
        sizeBytes: Number(d.size_bytes) || 0,
        notes: str(d.notes),
        uploadedBy: str(d.uploaded_by),
        createdAt: iso(d.created_at),
      })),
      emails: emails.map((e) => ({
        id: str(e.id),
        subject: str(e.subject),
        occurredAt: str(e.occurred_at),
        direction: str(e.direction) as "inbound" | "outbound",
        fromEmail: str(e.from_email),
        toEmail: str(e.to_email),
        summary: str(e.summary),
        attachmentDocumentIds: [],
        createdAt: iso(e.created_at),
      })),
      revision: Number(r.revision) || 1,
      updatedBy: r.updated_by != null ? str(r.updated_by) : undefined,
      deletedAt: isoOrNull(r.deleted_at),
      deletedBy: r.deleted_by != null ? str(r.deleted_by) : undefined,
      purgeAfter: isoOrNull(r.purge_after),
      createdAt: iso(r.created_at),
      updatedAt: iso(r.updated_at),
    });
  }
  return result;
}

async function listWorkspaces(
  sql: Sql,
  tenantId: string,
  onlyId?: string
): Promise<LeonardoWorkspace[]> {
  const rows = onlyId
    ? await sql`
        SELECT * FROM lean_event_workspaces
        WHERE tenant_id = ${tenantId} AND id = ${onlyId}
      `
    : await sql`
        SELECT * FROM lean_event_workspaces
        WHERE tenant_id = ${tenantId}
        ORDER BY updated_at DESC
      `;
  const result: LeonardoWorkspace[] = [];
  for (const r of rows) {
    const id = str(r.id);
    const tags = await sql`
      SELECT tag FROM lean_event_workspace_tags
      WHERE tenant_id = ${tenantId} AND workspace_id = ${id}
    `;
    const docs = await sql`
      SELECT doc_type, content FROM lean_event_workspace_documents
      WHERE tenant_id = ${tenantId} AND workspace_id = ${id}
    `;
    const documents: Record<string, string> = {};
    for (const d of docs) {
      documents[str(d.doc_type)] = str(d.content);
    }
    result.push({
      id,
      tenantId: str(r.tenant_id),
      createdBy: str(r.created_by),
      title: str(r.title),
      client: str(r.client),
      organization: str(r.organization),
      meetingDate: str(r.meeting_date),
      meetingType: str(r.meeting_type) as LeonardoWorkspace["meetingType"],
      tags: tags.map((t) => str(t.tag)),
      participants: str(r.participants),
      moderator: str(r.moderator),
      secretary: str(r.secretary),
      notes: str(r.notes),
      linkedEventId: r.linked_event_id != null ? str(r.linked_event_id) : null,
      status: str(r.status) as LeonardoWorkspace["status"],
      transcript: str(r.transcript),
      structured: (r.structured as Record<string, unknown> | null) ?? null,
      documents,
      errorMessage: r.error_message != null ? str(r.error_message) : null,
      revision: Number(r.revision) || 1,
      updatedBy: r.updated_by != null ? str(r.updated_by) : undefined,
      deletedAt: isoOrNull(r.deleted_at),
      deletedBy: r.deleted_by != null ? str(r.deleted_by) : undefined,
      purgeAfter: isoOrNull(r.purge_after),
      createdAt: iso(r.created_at),
      updatedAt: iso(r.updated_at),
    });
  }
  return result;
}

async function listEventChats(
  sql: Sql,
  tenantId: string,
  onlyId?: string
): Promise<LeonardoEventChatThread[]> {
  const rows = onlyId
    ? await sql`
        SELECT * FROM lean_event_event_chat_threads
        WHERE tenant_id = ${tenantId} AND id = ${onlyId}
      `
    : await sql`
        SELECT * FROM lean_event_event_chat_threads
        WHERE tenant_id = ${tenantId}
        ORDER BY updated_at DESC
      `;
  const result: LeonardoEventChatThread[] = [];
  for (const r of rows) {
    const id = str(r.id);
    const messages = await sql`
      SELECT * FROM lean_event_event_chat_messages
      WHERE tenant_id = ${tenantId} AND thread_id = ${id}
      ORDER BY sort_order
    `;
    result.push({
      id,
      tenantId: str(r.tenant_id),
      eventId: str(r.event_id),
      messages: messages.map((m) => ({
        id: str(m.id),
        eventId: str(m.event_id),
        tenantId: str(r.tenant_id),
        authorUserId: str(m.author_user_id),
        authorName: str(m.author_name),
        authorEmail: str(m.author_email),
        body: str(m.body),
        createdAt: iso(m.created_at),
      })),
      revision: Number(r.revision) || 1,
      updatedBy: r.updated_by != null ? str(r.updated_by) : undefined,
      deletedAt: isoOrNull(r.deleted_at),
      deletedBy: r.deleted_by != null ? str(r.deleted_by) : undefined,
      purgeAfter: isoOrNull(r.purge_after),
      createdAt: iso(r.created_at),
      updatedAt: iso(r.updated_at),
    });
  }
  return result;
}

async function listTeresa(
  sql: Sql,
  tenantId: string,
  onlyId?: string
): Promise<TeresaChatThread[]> {
  const rows = onlyId
    ? await sql`
        SELECT * FROM lean_event_teresa_chat_threads
        WHERE tenant_id = ${tenantId} AND id = ${onlyId}
      `
    : await sql`
        SELECT * FROM lean_event_teresa_chat_threads
        WHERE tenant_id = ${tenantId}
        ORDER BY updated_at DESC
      `;
  const result: TeresaChatThread[] = [];
  for (const r of rows) {
    const id = str(r.id);
    const messages = await sql`
      SELECT * FROM lean_event_teresa_chat_messages
      WHERE tenant_id = ${tenantId} AND thread_id = ${id}
      ORDER BY sort_order
    `;
    result.push({
      id,
      tenantId: str(r.tenant_id),
      userId: str(r.user_id),
      userEmail: str(r.user_email),
      userName: str(r.user_name),
      title: r.title != null ? str(r.title) : undefined,
      messages: messages.map((m) => ({
        id: str(m.id),
        role: str(m.role) as "user" | "assistant" | "system",
        content: str(m.content),
        createdAt: iso(m.created_at),
        contextLabel: m.context_label != null ? str(m.context_label) : undefined,
        contextKind: m.context_kind != null ? str(m.context_kind) : undefined,
        contextEntityId:
          m.context_entity_id != null ? str(m.context_entity_id) : undefined,
      })),
      revision: Number(r.revision) || 1,
      updatedBy: r.updated_by != null ? str(r.updated_by) : undefined,
      deletedAt: isoOrNull(r.deleted_at),
      deletedBy: r.deleted_by != null ? str(r.deleted_by) : undefined,
      purgeAfter: isoOrNull(r.purge_after),
      createdAt: iso(r.created_at),
      updatedAt: iso(r.updated_at),
    });
  }
  return result;
}
