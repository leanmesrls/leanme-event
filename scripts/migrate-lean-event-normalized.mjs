/**
 * ETL lean_event_entities (JSONB) → tabelle tipizzate 006.
 * Usage: npm.cmd run lean-event:migrate-normalized
 *
 * Ordine FK-safe: venues → contacts → suppliers → events → assignments → links → workspaces → chats
 * Orfani: venue_id / contact_id / linked_event_id invalidi → NULL (log warning).
 */
import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const url = process.env.LEAN_EVENT_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("FAIL: manca LEAN_EVENT_DATABASE_URL");
  process.exit(1);
}

const sql = neon(url);
const dry = process.argv.includes("--dry");

function ts(value) {
  if (!value) return null;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

function reqTs(value, fallback = new Date().toISOString()) {
  return ts(value) ?? fallback;
}

function str(value, fallback = "") {
  if (value == null) return fallback;
  return String(value);
}

function boolOrNull(value) {
  if (value === true || value === false) return value;
  return null;
}

async function loadType(entityType) {
  const rows = await sql`
    SELECT tenant_id, id, revision, payload, created_at, updated_at,
           created_by, updated_by, deleted_at, deleted_by, purge_after
    FROM lean_event_entities
    WHERE entity_type = ${entityType}
  `;
  return rows.map((row) => ({
    tenantId: row.tenant_id,
    id: row.id,
    revision: row.revision ?? row.payload?.revision ?? 1,
    payload: row.payload ?? {},
    createdAt: reqTs(row.created_at ?? row.payload?.createdAt),
    updatedAt: reqTs(row.updated_at ?? row.payload?.updatedAt),
    createdBy: row.created_by ?? row.payload?.createdBy ?? null,
    updatedBy: row.updated_by ?? row.payload?.updatedBy ?? null,
    deletedAt: ts(row.deleted_at ?? row.payload?.deletedAt),
    deletedBy: row.deleted_by ?? row.payload?.deletedBy ?? null,
    purgeAfter: ts(row.purge_after ?? row.payload?.purgeAfter),
  }));
}

const venueKeys = new Set();
const contactKeys = new Set();
const supplierKeys = new Set();
const eventKeys = new Set();
const warnings = [];

function key(tenantId, id) {
  return `${tenantId}::${id}`;
}

async function migrateVenues() {
  const rows = await loadType("venue");
  console.log(`venues: ${rows.length}`);
  if (dry) return;
  for (const row of rows) {
    const p = row.payload;
    await sql`
      INSERT INTO lean_event_venues (
        tenant_id, id, name, address, city, province, region, postal_code, country,
        phone, email, website, external_url, cover_image_url, star_category,
        internal_rating, internal_review, notes, revision, created_by, updated_by,
        deleted_at, deleted_by, purge_after, created_at, updated_at
      ) VALUES (
        ${row.tenantId}, ${row.id}, ${str(p.name)}, ${str(p.address)}, ${str(p.city)},
        ${str(p.province)}, ${p.region ?? null}, ${str(p.postalCode)}, ${p.country ?? null},
        ${str(p.phone)}, ${str(p.email)}, ${str(p.website)}, ${str(p.externalUrl)},
        ${str(p.coverImageUrl)}, ${str(p.starCategory)}, ${str(p.internalRating)},
        ${str(p.internalReview)}, ${str(p.notes)}, ${row.revision}, ${row.createdBy},
        ${row.updatedBy}, ${row.deletedAt}, ${row.deletedBy}, ${row.purgeAfter},
        ${row.createdAt}, ${row.updatedAt}
      )
      ON CONFLICT (tenant_id, id) DO UPDATE SET
        name = EXCLUDED.name, address = EXCLUDED.address, city = EXCLUDED.city,
        province = EXCLUDED.province, region = EXCLUDED.region,
        postal_code = EXCLUDED.postal_code, country = EXCLUDED.country,
        phone = EXCLUDED.phone, email = EXCLUDED.email, website = EXCLUDED.website,
        external_url = EXCLUDED.external_url, cover_image_url = EXCLUDED.cover_image_url,
        star_category = EXCLUDED.star_category, internal_rating = EXCLUDED.internal_rating,
        internal_review = EXCLUDED.internal_review, notes = EXCLUDED.notes,
        revision = EXCLUDED.revision, updated_by = EXCLUDED.updated_by,
        deleted_at = EXCLUDED.deleted_at, deleted_by = EXCLUDED.deleted_by,
        purge_after = EXCLUDED.purge_after, updated_at = EXCLUDED.updated_at
    `;
    venueKeys.add(key(row.tenantId, row.id));
  }
}

async function migrateContacts() {
  const rows = await loadType("contact");
  console.log(`contacts: ${rows.length}`);
  if (dry) return;
  for (const row of rows) {
    const p = row.payload;
    await sql`
      INSERT INTO lean_event_contacts (
        tenant_id, id, vocative, honorific_title, first_name, last_name, email,
        fiscal_code, birth_date, address, city, province, region, postal_code, country,
        organization, organization_address, organization_city, organization_province,
        organization_region, organization_postal_code, organization_country, organization_role,
        dietary_notes, mobility_notes, personal_requests, notes, revision, created_by,
        updated_by, deleted_at, deleted_by, purge_after, created_at, updated_at
      ) VALUES (
        ${row.tenantId}, ${row.id}, ${p.vocative ?? null}, ${p.honorificTitle ?? null},
        ${str(p.firstName)}, ${str(p.lastName)}, ${str(p.email)}, ${p.fiscalCode ?? null},
        ${p.birthDate ?? null}, ${p.address ?? null}, ${p.city ?? null}, ${p.province ?? null},
        ${p.region ?? null}, ${p.postalCode ?? null}, ${p.country ?? null},
        ${str(p.organization)}, ${p.organizationAddress ?? null}, ${p.organizationCity ?? null},
        ${p.organizationProvince ?? null}, ${p.organizationRegion ?? null},
        ${p.organizationPostalCode ?? null}, ${p.organizationCountry ?? null},
        ${p.organizationRole ?? null}, ${p.dietaryNotes ?? null}, ${p.mobilityNotes ?? null},
        ${p.personalRequests ?? null}, ${str(p.notes)}, ${row.revision}, ${row.createdBy},
        ${row.updatedBy}, ${row.deletedAt}, ${row.deletedBy}, ${row.purgeAfter},
        ${row.createdAt}, ${row.updatedAt}
      )
      ON CONFLICT (tenant_id, id) DO UPDATE SET
        first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name,
        email = EXCLUDED.email, organization = EXCLUDED.organization, notes = EXCLUDED.notes,
        revision = EXCLUDED.revision, updated_by = EXCLUDED.updated_by,
        deleted_at = EXCLUDED.deleted_at, updated_at = EXCLUDED.updated_at
    `;
    contactKeys.add(key(row.tenantId, row.id));

    await sql`DELETE FROM lean_event_contact_emails WHERE tenant_id = ${row.tenantId} AND contact_id = ${row.id}`;
    await sql`DELETE FROM lean_event_contact_phones WHERE tenant_id = ${row.tenantId} AND contact_id = ${row.id}`;
    await sql`DELETE FROM lean_event_contact_tags WHERE tenant_id = ${row.tenantId} AND contact_id = ${row.id}`;
    await sql`DELETE FROM lean_event_contact_privacy_consents WHERE tenant_id = ${row.tenantId} AND contact_id = ${row.id}`;

    const emails = Array.isArray(p.emails) ? p.emails : [];
    for (const [i, email] of emails.entries()) {
      const id = str(email.id, randomUUID());
      await sql`
        INSERT INTO lean_event_contact_emails (tenant_id, contact_id, id, label, address, sort_order)
        VALUES (${row.tenantId}, ${row.id}, ${id}, ${str(email.label)}, ${str(email.address)}, ${i})
      `;
    }
    const phones = Array.isArray(p.phones) ? p.phones : [];
    for (const [i, phone] of phones.entries()) {
      const id = str(phone.id, randomUUID());
      await sql`
        INSERT INTO lean_event_contact_phones (tenant_id, contact_id, id, label, number, sort_order)
        VALUES (${row.tenantId}, ${row.id}, ${id}, ${str(phone.label)}, ${str(phone.number)}, ${i})
      `;
    }
    const tags = Array.isArray(p.tags) ? p.tags : [];
    for (const tag of tags) {
      if (!tag) continue;
      await sql`
        INSERT INTO lean_event_contact_tags (tenant_id, contact_id, tag)
        VALUES (${row.tenantId}, ${row.id}, ${str(tag)})
        ON CONFLICT DO NOTHING
      `;
    }
    const consents = Array.isArray(p.privacyConsents) ? p.privacyConsents : [];
    for (const consent of consents) {
      const id = str(consent.id, randomUUID());
      await sql`
        INSERT INTO lean_event_contact_privacy_consents
          (tenant_id, contact_id, id, label, granted, granted_at)
        VALUES (
          ${row.tenantId}, ${row.id}, ${id}, ${str(consent.label)},
          ${Boolean(consent.granted)}, ${consent.grantedAt ?? null}
        )
      `;
    }
  }
}

async function migrateSuppliers() {
  const rows = await loadType("supplier");
  console.log(`suppliers: ${rows.length}`);
  if (dry) return;
  for (const row of rows) {
    const p = row.payload;
    await sql`
      INSERT INTO lean_event_suppliers (
        tenant_id, id, name, category_id, email, phone, address, city, province,
        region, postal_code, country, vat_number, contact_person, notes, revision,
        created_by, updated_by, deleted_at, deleted_by, purge_after, created_at, updated_at
      ) VALUES (
        ${row.tenantId}, ${row.id}, ${str(p.name)}, ${str(p.categoryId)}, ${str(p.email)},
        ${str(p.phone)}, ${str(p.address)}, ${str(p.city)}, ${str(p.province)},
        ${p.region ?? null}, ${p.postalCode ?? null}, ${p.country ?? null},
        ${str(p.vatNumber)}, ${str(p.contactPerson)}, ${str(p.notes)}, ${row.revision},
        ${row.createdBy}, ${row.updatedBy}, ${row.deletedAt}, ${row.deletedBy},
        ${row.purgeAfter}, ${row.createdAt}, ${row.updatedAt}
      )
      ON CONFLICT (tenant_id, id) DO UPDATE SET
        name = EXCLUDED.name, category_id = EXCLUDED.category_id, email = EXCLUDED.email,
        revision = EXCLUDED.revision, updated_at = EXCLUDED.updated_at,
        deleted_at = EXCLUDED.deleted_at
    `;
    supplierKeys.add(key(row.tenantId, row.id));

    await sql`DELETE FROM lean_event_supplier_agreements WHERE tenant_id = ${row.tenantId} AND supplier_id = ${row.id}`;
    const agreements = Array.isArray(p.agreements) ? p.agreements : [];
    for (const doc of agreements) {
      await sql`
        INSERT INTO lean_event_supplier_agreements (
          tenant_id, supplier_id, id, title, kind, document_date, file_name, file_url,
          mime_type, size_bytes, notes, uploaded_by, created_at
        ) VALUES (
          ${row.tenantId}, ${row.id}, ${str(doc.id, randomUUID())}, ${str(doc.title)},
          ${str(doc.kind, "altro")}, ${str(doc.documentDate)}, ${str(doc.fileName)},
          ${str(doc.fileUrl)}, ${str(doc.mimeType)}, ${Number(doc.sizeBytes) || 0},
          ${str(doc.notes)}, ${str(doc.uploadedBy)}, ${reqTs(doc.createdAt)}
        )
      `;
    }
  }
}

async function migrateEvents() {
  const rows = await loadType("event");
  console.log(`events: ${rows.length}`);
  if (dry) return;
  for (const row of rows) {
    const p = row.payload;
    const vd = p.venueDetails ?? {};
    let venueId = p.venueId || null;
    if (venueId && !venueKeys.has(key(row.tenantId, venueId))) {
      warnings.push(`event ${row.id}: venue_id orfano ${venueId} → NULL`);
      venueId = null;
    }
    const reg = p.registration ?? {};

    await sql`
      INSERT INTO lean_event_events (
        tenant_id, id, created_by, cdc, title, venue, venue_id,
        venue_name, venue_address, venue_city, venue_province, venue_region,
        venue_postal_code, venue_country, venue_is_online, venue_online_url, venue_notes,
        start_date, end_date, category_id, health_area_id, ecm_enabled, ecm_modality,
        formation_event_type_id, formation_structure_name, legacy_type, status, notes,
        is_favorite, project_leader_user_id, registration_paid, registration_refunds_enabled,
        registration_refund_rules, revision, updated_by, deleted_at, deleted_by, purge_after,
        created_at, updated_at
      ) VALUES (
        ${row.tenantId}, ${row.id}, ${str(p.createdBy ?? row.createdBy)}, ${str(p.cdc)},
        ${str(p.title)}, ${str(p.venue)}, ${venueId},
        ${vd.name ?? null}, ${vd.address ?? null}, ${vd.city ?? null}, ${vd.province ?? null},
        ${vd.region ?? null}, ${vd.postalCode ?? null}, ${vd.country ?? null},
        ${Boolean(vd.isOnline)}, ${vd.onlineUrl ?? null}, ${vd.notes ?? null},
        ${str(p.startDate)}, ${str(p.endDate)}, ${str(p.categoryId)}, ${p.healthAreaId ?? null},
        ${boolOrNull(p.ecmEnabled)}, ${p.ecmModality ?? null},
        ${p.formationEventTypeId ?? null}, ${p.formationStructureName ?? null},
        ${p.type ?? null}, ${str(p.status, "draft")}, ${str(p.notes)},
        ${Boolean(p.isFavorite)}, ${p.projectLeaderUserId ?? null},
        ${boolOrNull(reg.paid)}, ${boolOrNull(reg.refundsEnabled)},
        ${str(reg.refundRules)}, ${row.revision}, ${row.updatedBy},
        ${row.deletedAt}, ${row.deletedBy}, ${row.purgeAfter},
        ${row.createdAt}, ${row.updatedAt}
      )
      ON CONFLICT (tenant_id, id) DO UPDATE SET
        title = EXCLUDED.title, cdc = EXCLUDED.cdc, start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date, status = EXCLUDED.status,
        is_favorite = EXCLUDED.is_favorite, venue_id = EXCLUDED.venue_id,
        revision = EXCLUDED.revision, deleted_at = EXCLUDED.deleted_at,
        updated_at = EXCLUDED.updated_at
    `;
    eventKeys.add(key(row.tenantId, row.id));

    await sql`DELETE FROM lean_event_event_project_managers WHERE tenant_id = ${row.tenantId} AND event_id = ${row.id}`;
    for (const userId of Array.isArray(p.projectManagerUserIds) ? p.projectManagerUserIds : []) {
      if (!userId) continue;
      await sql`
        INSERT INTO lean_event_event_project_managers (tenant_id, event_id, user_id)
        VALUES (${row.tenantId}, ${row.id}, ${str(userId)})
        ON CONFLICT DO NOTHING
      `;
    }

    await sql`DELETE FROM lean_event_event_registration_fees WHERE tenant_id = ${row.tenantId} AND event_id = ${row.id}`;
    for (const [i, fee] of (Array.isArray(reg.fees) ? reg.fees : []).entries()) {
      await sql`
        INSERT INTO lean_event_event_registration_fees
          (tenant_id, event_id, id, label, amount, valid_from, valid_to, notes, sort_order)
        VALUES (
          ${row.tenantId}, ${row.id}, ${str(fee.id, randomUUID())}, ${str(fee.label)},
          ${str(fee.amount)}, ${str(fee.validFrom)}, ${str(fee.validTo)},
          ${fee.notes ?? null}, ${i}
        )
      `;
    }

    // Hotel blocks tree
    await sql`DELETE FROM lean_event_event_room_allotments WHERE tenant_id = ${row.tenantId} AND event_id = ${row.id}`;
    await sql`DELETE FROM lean_event_event_night_allotments WHERE tenant_id = ${row.tenantId} AND event_id = ${row.id}`;
    await sql`DELETE FROM lean_event_event_hotel_blocks WHERE tenant_id = ${row.tenantId} AND event_id = ${row.id}`;
    for (const [bi, block] of (Array.isArray(p.hotelBlocks) ? p.hotelBlocks : []).entries()) {
      const blockId = str(block.id, randomUUID());
      await sql`
        INSERT INTO lean_event_event_hotel_blocks
          (tenant_id, event_id, id, venue_id, check_in_date, check_out_date, notes, sort_order)
        VALUES (
          ${row.tenantId}, ${row.id}, ${blockId}, ${str(block.venueId)},
          ${str(block.checkInDate)}, ${str(block.checkOutDate)}, ${str(block.notes)}, ${bi}
        )
      `;
      for (const [ni, night] of (Array.isArray(block.nightAllotments) ? block.nightAllotments : []).entries()) {
        const nightId = str(night.id, randomUUID());
        await sql`
          INSERT INTO lean_event_event_night_allotments
            (tenant_id, event_id, hotel_block_id, id, night_date, sort_order)
          VALUES (${row.tenantId}, ${row.id}, ${blockId}, ${nightId}, ${str(night.nightDate)}, ${ni})
        `;
        for (const [ri, room] of (Array.isArray(night.roomAllotments) ? night.roomAllotments : []).entries()) {
          await sql`
            INSERT INTO lean_event_event_room_allotments
              (tenant_id, event_id, hotel_block_id, night_allotment_id, id, code, label, quantity, sort_order)
            VALUES (
              ${row.tenantId}, ${row.id}, ${blockId}, ${nightId}, ${str(room.id, randomUUID())},
              ${str(room.code)}, ${str(room.label)}, ${Number(room.quantity) || 0}, ${ri}
            )
          `;
        }
      }
    }

    // Program sessions
    await sql`DELETE FROM lean_event_event_program_sessions WHERE tenant_id = ${row.tenantId} AND event_id = ${row.id}`;
    const sessions = Array.isArray(p.scientificProgram?.sessions)
      ? p.scientificProgram.sessions
      : [];
    for (const [i, session] of sessions.entries()) {
      await sql`
        INSERT INTO lean_event_event_program_sessions (
          tenant_id, event_id, id, kind, day_date, start_time, end_time, title,
          moderators, speakers, other_speakers, sort_order
        ) VALUES (
          ${row.tenantId}, ${row.id}, ${str(session.id, randomUUID())},
          ${str(session.kind, "session")}, ${session.dayDate ?? null},
          ${str(session.startTime)}, ${str(session.endTime)}, ${str(session.title)},
          ${str(session.moderators)}, ${str(session.speakers)}, ${str(session.otherSpeakers)}, ${i}
        )
      `;
    }

    // ECM grid (scalars + people/targets)
    await sql`DELETE FROM lean_event_event_ecm_profession_targets WHERE tenant_id = ${row.tenantId} AND event_id = ${row.id}`;
    await sql`DELETE FROM lean_event_event_ecm_people WHERE tenant_id = ${row.tenantId} AND event_id = ${row.id}`;
    await sql`DELETE FROM lean_event_event_ecm_string_ids WHERE tenant_id = ${row.tenantId} AND event_id = ${row.id}`;
    await sql`DELETE FROM lean_event_event_ecm_sponsors WHERE tenant_id = ${row.tenantId} AND event_id = ${row.id}`;
    await sql`DELETE FROM lean_event_event_ecm_grids WHERE tenant_id = ${row.tenantId} AND event_id = ${row.id}`;
    if (p.ecmGrid && typeof p.ecmGrid === "object") {
      const g = p.ecmGrid;
      await sql`
        INSERT INTO lean_event_event_ecm_grids (
          tenant_id, event_id, is_corporate_training_project, concerns_infant_nutrition,
          effective_duration_hours, effective_duration_minutes, formative_objective_code,
          skills_technical_professional, skills_process, skills_system,
          workshop_inside_congress, interactive_residential_training, interactive_duration_hours,
          faculty_relevance, italian_only, foreign_languages, simultaneous_translation,
          participation_paid, participation_fee, expected_participants, online_registration,
          direct_recruitment, participant_provenance, learning_verification_id, durable_material,
          is_sponsored, other_funding, has_partner
        ) VALUES (
          ${row.tenantId}, ${row.id},
          ${boolOrNull(g.isCorporateTrainingProject)}, ${boolOrNull(g.concernsInfantNutrition)},
          ${g.effectiveDurationHours ?? null}, ${g.effectiveDurationMinutes ?? null},
          ${g.formativeObjectiveCode ?? null}, ${str(g.skillsTechnicalProfessional)},
          ${str(g.skillsProcess)}, ${str(g.skillsSystem)},
          ${boolOrNull(g.workshopInsideCongress)}, ${boolOrNull(g.interactiveResidentialTraining)},
          ${g.interactiveDurationHours ?? null}, ${g.facultyRelevance ?? null},
          ${boolOrNull(g.italianOnly)}, ${str(g.foreignLanguages)},
          ${boolOrNull(g.simultaneousTranslation)}, ${boolOrNull(g.participationPaid)},
          ${str(g.participationFee)}, ${g.expectedParticipants ?? null},
          ${boolOrNull(g.onlineRegistration)}, ${g.directRecruitment ?? null},
          ${g.participantProvenance ?? null}, ${g.learningVerificationId ?? null},
          ${str(g.durableMaterial)}, ${boolOrNull(g.isSponsored)}, ${boolOrNull(g.otherFunding)},
          ${boolOrNull(g.hasPartner)}
        )
      `;
    }
  }
}

async function migrateAssignments() {
  const rows = await loadType("assignment");
  console.log(`assignments: ${rows.length}`);
  if (dry) return;
  let skipped = 0;
  for (const row of rows) {
    const p = row.payload;
    if (!eventKeys.has(key(row.tenantId, p.eventId))) {
      warnings.push(`assignment ${row.id}: event mancante ${p.eventId}`);
      skipped += 1;
      continue;
    }
    if (!contactKeys.has(key(row.tenantId, p.contactId))) {
      warnings.push(`assignment ${row.id}: contact mancante ${p.contactId}`);
      skipped += 1;
      continue;
    }
    await sql`
      INSERT INTO lean_event_assignments (
        tenant_id, id, event_id, contact_id, role_category, notes, revision,
        updated_by, deleted_at, deleted_by, purge_after, created_at, updated_at
      ) VALUES (
        ${row.tenantId}, ${row.id}, ${str(p.eventId)}, ${str(p.contactId)},
        ${str(p.roleCategory)}, ${str(p.notes)}, ${row.revision}, ${row.updatedBy},
        ${row.deletedAt}, ${row.deletedBy}, ${row.purgeAfter}, ${row.createdAt}, ${row.updatedAt}
      )
      ON CONFLICT (tenant_id, id) DO UPDATE SET
        role_category = EXCLUDED.role_category, notes = EXCLUDED.notes,
        revision = EXCLUDED.revision, deleted_at = EXCLUDED.deleted_at,
        updated_at = EXCLUDED.updated_at
    `;

    const h = p.hospitality;
    await sql`DELETE FROM lean_event_assignment_hospitality WHERE tenant_id = ${row.tenantId} AND assignment_id = ${row.id}`;
    await sql`DELETE FROM lean_event_assignment_night_stays WHERE tenant_id = ${row.tenantId} AND assignment_id = ${row.id}`;
    await sql`DELETE FROM lean_event_assignment_travels WHERE tenant_id = ${row.tenantId} AND assignment_id = ${row.id}`;
    if (h && typeof h === "object") {
      await sql`
        INSERT INTO lean_event_assignment_hospitality (
          tenant_id, assignment_id, status, hotel_block_id, night_allotment_id, room_allotment_id,
          room_type_code, check_in, check_out, roommate_contact_id, roommate_first_name,
          roommate_last_name, roommate_phone, roommate_email, roommate_name, roommate_role,
          transfer_in, transfer_out, transfer_in_minutes_after, transfer_out_minutes_before,
          transfer_in_time, transfer_in_time_manual, transfer_out_time, transfer_out_time_manual,
          transfer_notes, dietary_requirements, allergies, accessibility_notes, internal_notes
        ) VALUES (
          ${row.tenantId}, ${row.id}, ${str(h.status, "pending")}, ${str(h.hotelBlockId)},
          ${str(h.nightAllotmentId)}, ${str(h.roomAllotmentId)}, ${str(h.roomTypeCode)},
          ${str(h.checkIn)}, ${str(h.checkOut)}, ${h.roommateContactId ?? null},
          ${str(h.roommateFirstName)}, ${str(h.roommateLastName)}, ${str(h.roommatePhone)},
          ${str(h.roommateEmail)}, ${str(h.roommateName)}, ${h.roommateRole ?? null},
          ${boolOrNull(h.transferIn)}, ${boolOrNull(h.transferOut)},
          ${h.transferInMinutesAfter ?? null}, ${h.transferOutMinutesBefore ?? null},
          ${h.transferInTime ?? null}, ${boolOrNull(h.transferInTimeManual)},
          ${h.transferOutTime ?? null}, ${boolOrNull(h.transferOutTimeManual)},
          ${str(h.transferNotes)}, ${str(h.dietaryRequirements)}, ${str(h.allergies)},
          ${str(h.accessibilityNotes)}, ${str(h.internalNotes)}
        )
      `;
      for (const stay of Array.isArray(h.nightStays) ? h.nightStays : []) {
        await sql`
          INSERT INTO lean_event_assignment_night_stays (
            tenant_id, assignment_id, id, night_date, hotel_block_id, night_allotment_id,
            room_allotment_id, room_type_code
          ) VALUES (
            ${row.tenantId}, ${row.id}, ${str(stay.id, randomUUID())}, ${str(stay.nightDate)},
            ${str(stay.hotelBlockId)}, ${str(stay.nightAllotmentId)},
            ${str(stay.roomAllotmentId)}, ${str(stay.roomTypeCode)}
          )
        `;
      }
      for (const [i, travel] of (Array.isArray(h.travels) ? h.travels : []).entries()) {
        await sql`
          INSERT INTO lean_event_assignment_travels (
            tenant_id, assignment_id, id, direction, mode, carrier, loyalty_program, loyalty_code,
            origin_city, origin_airport, destination_city, destination_airport, departure_at,
            arrival_at, document_url, document_front_url, document_back_url, notes, sort_order
          ) VALUES (
            ${row.tenantId}, ${row.id}, ${str(travel.id, randomUUID())},
            ${str(travel.direction, "outbound")}, ${str(travel.mode, "other")},
            ${str(travel.carrier)}, ${str(travel.loyaltyProgram)}, ${str(travel.loyaltyCode)},
            ${str(travel.originCity)}, ${str(travel.originAirport)},
            ${str(travel.destinationCity)}, ${str(travel.destinationAirport)},
            ${str(travel.departureAt)}, ${str(travel.arrivalAt)}, ${str(travel.documentUrl)},
            ${str(travel.documentFrontUrl)}, ${str(travel.documentBackUrl)},
            ${str(travel.notes)}, ${i}
          )
        `;
      }
    }
  }
  if (skipped) console.log(`assignments skipped (FK): ${skipped}`);
}

async function migrateSupplierLinks() {
  const rows = await loadType("event_supplier_link");
  console.log(`event_supplier_link: ${rows.length}`);
  if (dry) return;
  let skipped = 0;
  for (const row of rows) {
    const p = row.payload;
    if (!eventKeys.has(key(row.tenantId, p.eventId)) || !supplierKeys.has(key(row.tenantId, p.supplierId))) {
      warnings.push(`link ${row.id}: FK mancante event/supplier`);
      skipped += 1;
      continue;
    }
    await sql`
      INSERT INTO lean_event_event_supplier_links (
        tenant_id, id, event_id, supplier_id, category_id, role_notes, revision,
        updated_by, deleted_at, deleted_by, purge_after, created_at, updated_at
      ) VALUES (
        ${row.tenantId}, ${row.id}, ${str(p.eventId)}, ${str(p.supplierId)},
        ${str(p.categoryId)}, ${str(p.roleNotes)}, ${row.revision}, ${row.updatedBy},
        ${row.deletedAt}, ${row.deletedBy}, ${row.purgeAfter}, ${row.createdAt}, ${row.updatedAt}
      )
      ON CONFLICT (tenant_id, id) DO UPDATE SET
        category_id = EXCLUDED.category_id, role_notes = EXCLUDED.role_notes,
        revision = EXCLUDED.revision, deleted_at = EXCLUDED.deleted_at,
        updated_at = EXCLUDED.updated_at
    `;
  }
  if (skipped) console.log(`links skipped (FK): ${skipped}`);
}

async function migrateWorkspaces() {
  const rows = await loadType("workspace");
  console.log(`workspaces: ${rows.length}`);
  if (dry) return;
  for (const row of rows) {
    const p = row.payload;
    let linked = p.linkedEventId || null;
    if (linked && !eventKeys.has(key(row.tenantId, linked))) {
      warnings.push(`workspace ${row.id}: linkedEventId orfano → NULL`);
      linked = null;
    }
    await sql`
      INSERT INTO lean_event_workspaces (
        tenant_id, id, created_by, title, client, organization, meeting_date, meeting_type,
        participants, moderator, secretary, notes, linked_event_id, status, transcript,
        structured, error_message, revision, updated_by, deleted_at, deleted_by, purge_after,
        created_at, updated_at
      ) VALUES (
        ${row.tenantId}, ${row.id}, ${str(p.createdBy ?? row.createdBy)}, ${str(p.title)},
        ${str(p.client)}, ${str(p.organization)}, ${str(p.meetingDate)},
        ${str(p.meetingType, "internal_meeting")}, ${str(p.participants)}, ${str(p.moderator)},
        ${str(p.secretary)}, ${str(p.notes)}, ${linked}, ${str(p.status, "draft")},
        ${str(p.transcript)}, ${p.structured ?? null}, ${p.errorMessage ?? null},
        ${row.revision}, ${row.updatedBy}, ${row.deletedAt}, ${row.deletedBy},
        ${row.purgeAfter}, ${row.createdAt}, ${row.updatedAt}
      )
      ON CONFLICT (tenant_id, id) DO UPDATE SET
        title = EXCLUDED.title, status = EXCLUDED.status, transcript = EXCLUDED.transcript,
        structured = EXCLUDED.structured, revision = EXCLUDED.revision,
        deleted_at = EXCLUDED.deleted_at, updated_at = EXCLUDED.updated_at
    `;
    await sql`DELETE FROM lean_event_workspace_tags WHERE tenant_id = ${row.tenantId} AND workspace_id = ${row.id}`;
    await sql`DELETE FROM lean_event_workspace_documents WHERE tenant_id = ${row.tenantId} AND workspace_id = ${row.id}`;
    for (const tag of Array.isArray(p.tags) ? p.tags : []) {
      if (!tag) continue;
      await sql`
        INSERT INTO lean_event_workspace_tags (tenant_id, workspace_id, tag)
        VALUES (${row.tenantId}, ${row.id}, ${str(tag)}) ON CONFLICT DO NOTHING
      `;
    }
    const docs = p.documents && typeof p.documents === "object" ? p.documents : {};
    for (const [docType, content] of Object.entries(docs)) {
      await sql`
        INSERT INTO lean_event_workspace_documents (tenant_id, workspace_id, doc_type, content)
        VALUES (${row.tenantId}, ${row.id}, ${docType}, ${str(content)})
        ON CONFLICT (tenant_id, workspace_id, doc_type) DO UPDATE SET content = EXCLUDED.content
      `;
    }
  }
}

async function migrateEventChats() {
  const rows = await loadType("event_chat");
  console.log(`event_chat: ${rows.length}`);
  if (dry) return;
  for (const row of rows) {
    const p = row.payload;
    if (!eventKeys.has(key(row.tenantId, p.eventId))) {
      warnings.push(`event_chat ${row.id}: event mancante`);
      continue;
    }
    await sql`
      INSERT INTO lean_event_event_chat_threads (
        tenant_id, id, event_id, revision, updated_by, deleted_at, deleted_by,
        purge_after, created_at, updated_at
      ) VALUES (
        ${row.tenantId}, ${row.id}, ${str(p.eventId)}, ${row.revision}, ${row.updatedBy},
        ${row.deletedAt}, ${row.deletedBy}, ${row.purgeAfter}, ${row.createdAt}, ${row.updatedAt}
      )
      ON CONFLICT (tenant_id, id) DO UPDATE SET
        revision = EXCLUDED.revision, updated_at = EXCLUDED.updated_at,
        deleted_at = EXCLUDED.deleted_at
    `;
    await sql`DELETE FROM lean_event_event_chat_messages WHERE tenant_id = ${row.tenantId} AND thread_id = ${row.id}`;
    for (const [i, msg] of (Array.isArray(p.messages) ? p.messages : []).entries()) {
      await sql`
        INSERT INTO lean_event_event_chat_messages (
          tenant_id, thread_id, id, event_id, author_user_id, author_name, author_email,
          body, created_at, sort_order
        ) VALUES (
          ${row.tenantId}, ${row.id}, ${str(msg.id, randomUUID())}, ${str(p.eventId)},
          ${str(msg.authorUserId)}, ${str(msg.authorName)}, ${str(msg.authorEmail)},
          ${str(msg.body)}, ${reqTs(msg.createdAt)}, ${i}
        )
      `;
    }
  }
}

async function migrateTeresa() {
  const rows = await loadType("teresa_chat");
  console.log(`teresa_chat: ${rows.length}`);
  if (dry) return;
  for (const row of rows) {
    const p = row.payload;
    await sql`
      INSERT INTO lean_event_teresa_chat_threads (
        tenant_id, id, user_id, user_email, user_name, title, revision, updated_by,
        deleted_at, deleted_by, purge_after, created_at, updated_at
      ) VALUES (
        ${row.tenantId}, ${row.id}, ${str(p.userId)}, ${str(p.userEmail)}, ${str(p.userName)},
        ${p.title ?? null}, ${row.revision}, ${row.updatedBy}, ${row.deletedAt},
        ${row.deletedBy}, ${row.purgeAfter}, ${row.createdAt}, ${row.updatedAt}
      )
      ON CONFLICT (tenant_id, id) DO UPDATE SET
        title = EXCLUDED.title, revision = EXCLUDED.revision, updated_at = EXCLUDED.updated_at
    `;
    await sql`DELETE FROM lean_event_teresa_chat_messages WHERE tenant_id = ${row.tenantId} AND thread_id = ${row.id}`;
    for (const [i, msg] of (Array.isArray(p.messages) ? p.messages : []).entries()) {
      await sql`
        INSERT INTO lean_event_teresa_chat_messages (
          tenant_id, thread_id, id, role, content, created_at, context_label,
          context_kind, context_entity_id, sort_order
        ) VALUES (
          ${row.tenantId}, ${row.id}, ${str(msg.id, randomUUID())}, ${str(msg.role)},
          ${str(msg.content)}, ${reqTs(msg.createdAt)}, ${msg.contextLabel ?? null},
          ${msg.contextKind ?? null}, ${msg.contextEntityId ?? null}, ${i}
        )
      `;
    }
  }
}

console.log(dry ? "DRY RUN (solo conteggi entities)" : "MIGRATE → tabelle normalizzate");
await migrateVenues();
await migrateContacts();
await migrateSuppliers();
await migrateEvents();
await migrateAssignments();
await migrateSupplierLinks();
await migrateWorkspaces();
await migrateEventChats();
await migrateTeresa();

if (!dry) {
  await sql`
    INSERT INTO lean_event_schema_meta (key, value)
    VALUES ('normalized_migrated_at', ${new Date().toISOString()})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
}

console.log(`Warnings: ${warnings.length}`);
for (const w of warnings.slice(0, 40)) console.warn(`  - ${w}`);
if (warnings.length > 40) console.warn(`  … +${warnings.length - 40} altri`);
console.log("OK: migrate-normalized completato.");
