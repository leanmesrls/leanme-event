/**
 * Replace-all child rows for normalized SoT (allineato a migrate-lean-event-normalized).
 */

import { randomUUID } from "node:crypto";

import type { getLeanEventSql } from "@/lib/lean-event/db";

type Sql = NonNullable<ReturnType<typeof getLeanEventSql>>;

function str(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  return String(value);
}

function boolOrNull(value: unknown): boolean | null {
  if (value === true || value === false) return value;
  return null;
}

function reqTs(value: unknown): string {
  if (typeof value === "string" && value) {
    const ms = Date.parse(value);
    if (Number.isFinite(ms)) return new Date(ms).toISOString();
  }
  return new Date().toISOString();
}

export async function syncSupplierChildren(
  sql: Sql,
  tenantId: string,
  supplierId: string,
  p: Record<string, unknown>
): Promise<void> {
  await sql`
    DELETE FROM lean_event_supplier_agreements
    WHERE tenant_id = ${tenantId} AND supplier_id = ${supplierId}
  `;
  for (const doc of Array.isArray(p.agreements) ? p.agreements : []) {
    const d = doc as Record<string, unknown>;
    await sql`
      INSERT INTO lean_event_supplier_agreements (
        tenant_id, supplier_id, id, title, kind, document_date, file_name, file_url,
        mime_type, size_bytes, notes, uploaded_by, created_at
      ) VALUES (
        ${tenantId}, ${supplierId}, ${str(d.id, randomUUID())}, ${str(d.title)},
        ${str(d.kind, "altro")}, ${str(d.documentDate)}, ${str(d.fileName)},
        ${str(d.fileUrl)}, ${str(d.mimeType)}, ${Number(d.sizeBytes) || 0},
        ${str(d.notes)}, ${str(d.uploadedBy)}, ${reqTs(d.createdAt)}
      )
    `;
  }
}

export async function syncEventChildren(
  sql: Sql,
  tenantId: string,
  eventId: string,
  p: Record<string, unknown>
): Promise<void> {
  const reg = (p.registration as Record<string, unknown> | undefined) ?? {};

  await sql`DELETE FROM lean_event_event_project_managers WHERE tenant_id = ${tenantId} AND event_id = ${eventId}`;
  for (const userId of Array.isArray(p.projectManagerUserIds)
    ? p.projectManagerUserIds
    : []) {
    if (!userId) continue;
    await sql`
      INSERT INTO lean_event_event_project_managers (tenant_id, event_id, user_id)
      VALUES (${tenantId}, ${eventId}, ${str(userId)})
      ON CONFLICT DO NOTHING
    `;
  }

  await sql`DELETE FROM lean_event_event_registration_fees WHERE tenant_id = ${tenantId} AND event_id = ${eventId}`;
  for (const [i, fee] of (Array.isArray(reg.fees) ? reg.fees : []).entries()) {
    const f = fee as Record<string, unknown>;
    await sql`
      INSERT INTO lean_event_event_registration_fees
        (tenant_id, event_id, id, label, amount, valid_from, valid_to, notes, sort_order)
      VALUES (
        ${tenantId}, ${eventId}, ${str(f.id, randomUUID())}, ${str(f.label)},
        ${str(f.amount)}, ${str(f.validFrom)}, ${str(f.validTo)},
        ${f.notes != null ? str(f.notes) : null}, ${i}
      )
    `;
  }

  await sql`DELETE FROM lean_event_event_sponsors WHERE tenant_id = ${tenantId} AND event_id = ${eventId}`;
  for (const sponsor of Array.isArray(p.eventSponsors) ? p.eventSponsors : []) {
    const s = sponsor as Record<string, unknown>;
    let contactId = (s.contactId as string | null) || null;
    if (contactId) {
      const exists = await sql`
        SELECT 1 FROM lean_event_contacts
        WHERE tenant_id = ${tenantId} AND id = ${contactId} LIMIT 1
      `;
      if (!exists.length) contactId = null;
    }
    await sql`
      INSERT INTO lean_event_event_sponsors (
        tenant_id, event_id, id, contact_id, company_name, contact_name,
        agreement_summary, contract_ref, sponsorship_type, amount, notes
      ) VALUES (
        ${tenantId}, ${eventId}, ${str(s.id, randomUUID())}, ${contactId},
        ${str(s.companyName)}, ${s.contactName != null ? str(s.contactName) : null},
        ${s.agreementSummary != null ? str(s.agreementSummary) : null},
        ${s.contractRef != null ? str(s.contractRef) : null},
        ${s.sponsorshipType != null ? str(s.sponsorshipType) : null},
        ${s.amount != null ? str(s.amount) : null},
        ${s.notes != null ? str(s.notes) : null}
      )
    `;
  }

  await sql`DELETE FROM lean_event_event_related WHERE tenant_id = ${tenantId} AND event_id = ${eventId}`;
  for (const rel of Array.isArray(p.relatedEvents) ? p.relatedEvents : []) {
    const r = rel as Record<string, unknown>;
    await sql`
      INSERT INTO lean_event_event_related (
        tenant_id, event_id, id, kind, title, starts_at, ends_at, venue, venue_id,
        notes, companions_allowed, max_companions_per_guest
      ) VALUES (
        ${tenantId}, ${eventId}, ${str(r.id, randomUUID())}, ${str(r.kind, "altro")},
        ${str(r.title)}, ${str(r.startsAt)}, ${str(r.endsAt)}, ${str(r.venue)},
        ${(r.venueId as string) || null}, ${str(r.notes)},
        ${Boolean(r.companionsAllowed)}, ${Number(r.maxCompanionsPerGuest) || 0}
      )
    `;
  }

  await sql`DELETE FROM lean_event_event_program_sessions WHERE tenant_id = ${tenantId} AND event_id = ${eventId}`;
  const sessions = Array.isArray(
    (p.scientificProgram as { sessions?: unknown[] } | undefined)?.sessions
  )
    ? (p.scientificProgram as { sessions: unknown[] }).sessions
    : [];
  for (const [i, session] of sessions.entries()) {
    const s = session as Record<string, unknown>;
    await sql`
      INSERT INTO lean_event_event_program_sessions (
        tenant_id, event_id, id, kind, day_date, start_time, end_time, title,
        moderators, speakers, other_speakers, sort_order
      ) VALUES (
        ${tenantId}, ${eventId}, ${str(s.id, randomUUID())},
        ${str(s.kind, "session")}, ${s.dayDate != null ? str(s.dayDate) : null},
        ${str(s.startTime)}, ${str(s.endTime)}, ${str(s.title)},
        ${str(s.moderators)}, ${str(s.speakers)}, ${str(s.otherSpeakers)}, ${i}
      )
    `;
  }

  // Hotel tree
  await sql`DELETE FROM lean_event_event_room_allotments WHERE tenant_id = ${tenantId} AND event_id = ${eventId}`;
  await sql`DELETE FROM lean_event_event_night_allotments WHERE tenant_id = ${tenantId} AND event_id = ${eventId}`;
  await sql`DELETE FROM lean_event_event_hotel_blocks WHERE tenant_id = ${tenantId} AND event_id = ${eventId}`;
  for (const [bi, block] of (Array.isArray(p.hotelBlocks) ? p.hotelBlocks : []).entries()) {
    const b = block as Record<string, unknown>;
    const blockId = str(b.id, randomUUID());
    await sql`
      INSERT INTO lean_event_event_hotel_blocks
        (tenant_id, event_id, id, venue_id, check_in_date, check_out_date, notes, sort_order)
      VALUES (
        ${tenantId}, ${eventId}, ${blockId}, ${str(b.venueId)},
        ${str(b.checkInDate)}, ${str(b.checkOutDate)}, ${str(b.notes)}, ${bi}
      )
    `;
    for (const [ni, night] of (Array.isArray(b.nightAllotments)
      ? b.nightAllotments
      : []
    ).entries()) {
      const n = night as Record<string, unknown>;
      const nightId = str(n.id, randomUUID());
      await sql`
        INSERT INTO lean_event_event_night_allotments
          (tenant_id, event_id, hotel_block_id, id, night_date, sort_order)
        VALUES (${tenantId}, ${eventId}, ${blockId}, ${nightId}, ${str(n.nightDate)}, ${ni})
      `;
      for (const [ri, room] of (Array.isArray(n.roomAllotments)
        ? n.roomAllotments
        : []
      ).entries()) {
        const rm = room as Record<string, unknown>;
        await sql`
          INSERT INTO lean_event_event_room_allotments
            (tenant_id, event_id, hotel_block_id, night_allotment_id, id, code, label, quantity, sort_order)
          VALUES (
            ${tenantId}, ${eventId}, ${blockId}, ${nightId}, ${str(rm.id, randomUUID())},
            ${str(rm.code)}, ${str(rm.label)}, ${Number(rm.quantity) || 0}, ${ri}
          )
        `;
      }
    }
  }

  // ECM
  await sql`DELETE FROM lean_event_event_ecm_profession_targets WHERE tenant_id = ${tenantId} AND event_id = ${eventId}`;
  await sql`DELETE FROM lean_event_event_ecm_people WHERE tenant_id = ${tenantId} AND event_id = ${eventId}`;
  await sql`DELETE FROM lean_event_event_ecm_string_ids WHERE tenant_id = ${tenantId} AND event_id = ${eventId}`;
  await sql`DELETE FROM lean_event_event_ecm_sponsors WHERE tenant_id = ${tenantId} AND event_id = ${eventId}`;
  await sql`DELETE FROM lean_event_event_ecm_grids WHERE tenant_id = ${tenantId} AND event_id = ${eventId}`;

  const g = p.ecmGrid as Record<string, unknown> | null | undefined;
  if (g && typeof g === "object") {
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
        ${tenantId}, ${eventId},
        ${boolOrNull(g.isCorporateTrainingProject)}, ${boolOrNull(g.concernsInfantNutrition)},
        ${g.effectiveDurationHours != null ? Number(g.effectiveDurationHours) : null},
        ${g.effectiveDurationMinutes != null ? Number(g.effectiveDurationMinutes) : null},
        ${g.formativeObjectiveCode != null ? Number(g.formativeObjectiveCode) : null},
        ${str(g.skillsTechnicalProfessional)}, ${str(g.skillsProcess)}, ${str(g.skillsSystem)},
        ${boolOrNull(g.workshopInsideCongress)}, ${boolOrNull(g.interactiveResidentialTraining)},
        ${g.interactiveDurationHours != null ? Number(g.interactiveDurationHours) : null},
        ${g.facultyRelevance != null ? str(g.facultyRelevance) : null},
        ${boolOrNull(g.italianOnly)}, ${str(g.foreignLanguages)},
        ${boolOrNull(g.simultaneousTranslation)}, ${boolOrNull(g.participationPaid)},
        ${str(g.participationFee)},
        ${g.expectedParticipants != null ? Number(g.expectedParticipants) : null},
        ${boolOrNull(g.onlineRegistration)},
        ${g.directRecruitment != null ? str(g.directRecruitment) : null},
        ${g.participantProvenance != null ? str(g.participantProvenance) : null},
        ${g.learningVerificationId != null ? str(g.learningVerificationId) : null},
        ${str(g.durableMaterial)}, ${boolOrNull(g.isSponsored)}, ${boolOrNull(g.otherFunding)},
        ${boolOrNull(g.hasPartner)}
      )
    `;

    for (const [i, t] of (Array.isArray(g.professionTargets)
      ? g.professionTargets
      : []
    ).entries()) {
      const target = t as Record<string, unknown>;
      await sql`
        INSERT INTO lean_event_event_ecm_profession_targets
          (tenant_id, event_id, id, profession, discipline, sort_order)
        VALUES (
          ${tenantId}, ${eventId}, ${randomUUID()},
          ${str(target.professionId ?? target.profession)},
          ${str(target.disciplineId ?? target.discipline)}, ${i}
        )
      `;
    }

    async function insertPeople(role: string, list: unknown) {
      for (const [i, person] of (Array.isArray(list) ? list : []).entries()) {
        const pe = person as Record<string, unknown>;
        let contactId = (pe.contactId as string | null) || null;
        if (contactId) {
          const exists = await sql`
            SELECT 1 FROM lean_event_contacts
            WHERE tenant_id = ${tenantId} AND id = ${contactId} LIMIT 1
          `;
          if (!exists.length) contactId = null;
        }
        await sql`
          INSERT INTO lean_event_event_ecm_people (
            tenant_id, event_id, id, role, contact_id, last_name, first_name,
            fiscal_code, phone, mobile, email, qualification, sort_order
          ) VALUES (
            ${tenantId}, ${eventId}, ${randomUUID()}, ${role}, ${contactId},
            ${str(pe.lastName)}, ${str(pe.firstName)}, ${str(pe.fiscalCode)},
            ${pe.phone != null ? str(pe.phone) : null},
            ${pe.mobile != null ? str(pe.mobile) : null},
            ${pe.email != null ? str(pe.email) : null},
            ${pe.qualification != null ? str(pe.qualification) : null}, ${i}
          )
        `;
      }
    }
    await insertPeople("scientific_lead", g.scientificLeads);
    await insertPeople("scientific_committee", g.scientificCommittee);

    for (const [i, value] of (Array.isArray(g.teachingMethodIds)
      ? g.teachingMethodIds
      : []
    ).entries()) {
      await sql`
        INSERT INTO lean_event_event_ecm_string_ids
          (tenant_id, event_id, kind, value, sort_order)
        VALUES (${tenantId}, ${eventId}, ${"teaching_method"}, ${str(value)}, ${i})
      `;
    }
    for (const [i, value] of (Array.isArray(g.presenceVerificationIds)
      ? g.presenceVerificationIds
      : []
    ).entries()) {
      await sql`
        INSERT INTO lean_event_event_ecm_string_ids
          (tenant_id, event_id, kind, value, sort_order)
        VALUES (${tenantId}, ${eventId}, ${"presence_verification"}, ${str(value)}, ${i})
      `;
    }

    async function insertSponsors(kind: string, list: unknown) {
      for (const [i, item] of (Array.isArray(list) ? list : []).entries()) {
        const s = item as Record<string, unknown>;
        await sql`
          INSERT INTO lean_event_event_ecm_sponsors
            (tenant_id, event_id, id, kind, company, amount, modality, sort_order)
          VALUES (
            ${tenantId}, ${eventId}, ${str(s.id, randomUUID())}, ${kind},
            ${str(s.company)}, ${str(s.amount)}, ${str(s.modality)}, ${i}
          )
        `;
      }
    }
    await insertSponsors("sponsor", g.sponsors);
    await insertSponsors("other_funding", g.otherFundingEntries);
    await insertSponsors("partner", g.partners);
  }
}

export async function syncAssignmentChildren(
  sql: Sql,
  tenantId: string,
  assignmentId: string,
  p: Record<string, unknown>
): Promise<void> {
  await sql`DELETE FROM lean_event_assignment_related_companions WHERE tenant_id = ${tenantId} AND assignment_id = ${assignmentId}`;
  await sql`DELETE FROM lean_event_assignment_related_participations WHERE tenant_id = ${tenantId} AND assignment_id = ${assignmentId}`;
  await sql`DELETE FROM lean_event_assignment_travels WHERE tenant_id = ${tenantId} AND assignment_id = ${assignmentId}`;
  await sql`DELETE FROM lean_event_assignment_night_stays WHERE tenant_id = ${tenantId} AND assignment_id = ${assignmentId}`;
  await sql`DELETE FROM lean_event_assignment_hospitality WHERE tenant_id = ${tenantId} AND assignment_id = ${assignmentId}`;

  const h = p.hospitality as Record<string, unknown> | undefined;
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
        ${tenantId}, ${assignmentId}, ${str(h.status, "pending")}, ${str(h.hotelBlockId)},
        ${str(h.nightAllotmentId)}, ${str(h.roomAllotmentId)}, ${str(h.roomTypeCode)},
        ${str(h.checkIn)}, ${str(h.checkOut)}, ${(h.roommateContactId as string) || null},
        ${str(h.roommateFirstName)}, ${str(h.roommateLastName)}, ${str(h.roommatePhone)},
        ${str(h.roommateEmail)}, ${str(h.roommateName)},
        ${h.roommateRole != null ? str(h.roommateRole) : null},
        ${boolOrNull(h.transferIn)}, ${boolOrNull(h.transferOut)},
        ${h.transferInMinutesAfter != null ? Number(h.transferInMinutesAfter) : null},
        ${h.transferOutMinutesBefore != null ? Number(h.transferOutMinutesBefore) : null},
        ${h.transferInTime != null ? str(h.transferInTime) : null},
        ${boolOrNull(h.transferInTimeManual)},
        ${h.transferOutTime != null ? str(h.transferOutTime) : null},
        ${boolOrNull(h.transferOutTimeManual)},
        ${str(h.transferNotes)}, ${str(h.dietaryRequirements)}, ${str(h.allergies)},
        ${str(h.accessibilityNotes)}, ${str(h.internalNotes)}
      )
    `;
    for (const stay of Array.isArray(h.nightStays) ? h.nightStays : []) {
      const s = stay as Record<string, unknown>;
      await sql`
        INSERT INTO lean_event_assignment_night_stays (
          tenant_id, assignment_id, id, night_date, hotel_block_id, night_allotment_id,
          room_allotment_id, room_type_code
        ) VALUES (
          ${tenantId}, ${assignmentId}, ${str(s.id, randomUUID())}, ${str(s.nightDate)},
          ${str(s.hotelBlockId)}, ${str(s.nightAllotmentId)},
          ${str(s.roomAllotmentId)}, ${str(s.roomTypeCode)}
        )
      `;
    }
    for (const [i, travel] of (Array.isArray(h.travels) ? h.travels : []).entries()) {
      const t = travel as Record<string, unknown>;
      await sql`
        INSERT INTO lean_event_assignment_travels (
          tenant_id, assignment_id, id, direction, mode, carrier, loyalty_program, loyalty_code,
          origin_city, origin_airport, destination_city, destination_airport, departure_at,
          arrival_at, document_url, document_front_url, document_back_url, notes, sort_order
        ) VALUES (
          ${tenantId}, ${assignmentId}, ${str(t.id, randomUUID())},
          ${str(t.direction, "outbound")}, ${str(t.mode, "other")},
          ${str(t.carrier)}, ${str(t.loyaltyProgram)}, ${str(t.loyaltyCode)},
          ${str(t.originCity)}, ${str(t.originAirport)},
          ${str(t.destinationCity)}, ${str(t.destinationAirport)},
          ${str(t.departureAt)}, ${str(t.arrivalAt)}, ${str(t.documentUrl)},
          ${str(t.documentFrontUrl)}, ${str(t.documentBackUrl)},
          ${str(t.notes)}, ${i}
        )
      `;
    }
  }

  for (const part of Array.isArray(p.relatedParticipations)
    ? p.relatedParticipations
    : []) {
    const pr = part as Record<string, unknown>;
    const relatedEventId = str(pr.relatedEventId);
    if (!relatedEventId) continue;
    await sql`
      INSERT INTO lean_event_assignment_related_participations
        (tenant_id, assignment_id, related_event_id, status, notes)
      VALUES (
        ${tenantId}, ${assignmentId}, ${relatedEventId},
        ${str(pr.status, "pending")}, ${str(pr.notes)}
      )
    `;
    for (const [i, companion] of (Array.isArray(pr.companions)
      ? pr.companions
      : []
    ).entries()) {
      const c = companion as Record<string, unknown>;
      await sql`
        INSERT INTO lean_event_assignment_related_companions (
          tenant_id, assignment_id, related_event_id, id, contact_id,
          first_name, last_name, phone, email, sort_order
        ) VALUES (
          ${tenantId}, ${assignmentId}, ${relatedEventId}, ${randomUUID()},
          ${(c.contactId as string) || null}, ${str(c.firstName)}, ${str(c.lastName)},
          ${str(c.phone)}, ${str(c.email)}, ${i}
        )
      `;
    }
  }
}

export async function syncSupplierLinkChildren(
  sql: Sql,
  tenantId: string,
  linkId: string,
  p: Record<string, unknown>
): Promise<void> {
  await sql`DELETE FROM lean_event_event_supplier_documents WHERE tenant_id = ${tenantId} AND link_id = ${linkId}`;
  await sql`DELETE FROM lean_event_event_supplier_emails WHERE tenant_id = ${tenantId} AND link_id = ${linkId}`;
  for (const doc of Array.isArray(p.documents) ? p.documents : []) {
    const d = doc as Record<string, unknown>;
    await sql`
      INSERT INTO lean_event_event_supplier_documents (
        tenant_id, link_id, id, title, kind, document_date, file_name, file_url,
        mime_type, size_bytes, notes, uploaded_by, created_at
      ) VALUES (
        ${tenantId}, ${linkId}, ${str(d.id, randomUUID())}, ${str(d.title)},
        ${str(d.kind, "altro")}, ${str(d.documentDate)}, ${str(d.fileName)},
        ${str(d.fileUrl)}, ${str(d.mimeType)}, ${Number(d.sizeBytes) || 0},
        ${str(d.notes)}, ${str(d.uploadedBy)}, ${reqTs(d.createdAt)}
      )
    `;
  }
  for (const email of Array.isArray(p.emails) ? p.emails : []) {
    const e = email as Record<string, unknown>;
    await sql`
      INSERT INTO lean_event_event_supplier_emails (
        tenant_id, link_id, id, subject, occurred_at, direction, from_email, to_email,
        summary, created_at
      ) VALUES (
        ${tenantId}, ${linkId}, ${str(e.id, randomUUID())}, ${str(e.subject)},
        ${str(e.occurredAt)}, ${str(e.direction, "outbound")}, ${str(e.fromEmail)},
        ${str(e.toEmail)}, ${str(e.summary)}, ${reqTs(e.createdAt)}
      )
    `;
  }
}

export async function syncWorkspaceChildren(
  sql: Sql,
  tenantId: string,
  workspaceId: string,
  p: Record<string, unknown>
): Promise<void> {
  await sql`DELETE FROM lean_event_workspace_tags WHERE tenant_id = ${tenantId} AND workspace_id = ${workspaceId}`;
  await sql`DELETE FROM lean_event_workspace_documents WHERE tenant_id = ${tenantId} AND workspace_id = ${workspaceId}`;
  for (const tag of Array.isArray(p.tags) ? p.tags : []) {
    if (!tag) continue;
    await sql`
      INSERT INTO lean_event_workspace_tags (tenant_id, workspace_id, tag)
      VALUES (${tenantId}, ${workspaceId}, ${str(tag)})
      ON CONFLICT DO NOTHING
    `;
  }
  const docs =
    p.documents && typeof p.documents === "object"
      ? (p.documents as Record<string, unknown>)
      : {};
  for (const [docType, content] of Object.entries(docs)) {
    await sql`
      INSERT INTO lean_event_workspace_documents (tenant_id, workspace_id, doc_type, content)
      VALUES (${tenantId}, ${workspaceId}, ${docType}, ${str(content)})
      ON CONFLICT (tenant_id, workspace_id, doc_type) DO UPDATE SET content = EXCLUDED.content
    `;
  }
}

export async function syncEventChatChildren(
  sql: Sql,
  tenantId: string,
  threadId: string,
  eventId: string,
  p: Record<string, unknown>
): Promise<void> {
  await sql`DELETE FROM lean_event_event_chat_messages WHERE tenant_id = ${tenantId} AND thread_id = ${threadId}`;
  for (const [i, msg] of (Array.isArray(p.messages) ? p.messages : []).entries()) {
    const m = msg as Record<string, unknown>;
    await sql`
      INSERT INTO lean_event_event_chat_messages (
        tenant_id, thread_id, id, event_id, author_user_id, author_name, author_email,
        body, created_at, sort_order
      ) VALUES (
        ${tenantId}, ${threadId}, ${str(m.id, randomUUID())}, ${eventId},
        ${str(m.authorUserId)}, ${str(m.authorName)}, ${str(m.authorEmail)},
        ${str(m.body)}, ${reqTs(m.createdAt)}, ${i}
      )
    `;
  }
}

export async function syncTeresaChildren(
  sql: Sql,
  tenantId: string,
  threadId: string,
  p: Record<string, unknown>
): Promise<void> {
  await sql`DELETE FROM lean_event_teresa_chat_messages WHERE tenant_id = ${tenantId} AND thread_id = ${threadId}`;
  for (const [i, msg] of (Array.isArray(p.messages) ? p.messages : []).entries()) {
    const m = msg as Record<string, unknown>;
    await sql`
      INSERT INTO lean_event_teresa_chat_messages (
        tenant_id, thread_id, id, role, content, created_at, context_label,
        context_kind, context_entity_id, sort_order
      ) VALUES (
        ${tenantId}, ${threadId}, ${str(m.id, randomUUID())}, ${str(m.role)},
        ${str(m.content)}, ${reqTs(m.createdAt)},
        ${m.contextLabel != null ? str(m.contextLabel) : null},
        ${m.contextKind != null ? str(m.contextKind) : null},
        ${m.contextEntityId != null ? str(m.contextEntityId) : null}, ${i}
      )
    `;
  }
}
