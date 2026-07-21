/**
 * Dual-write / SoT normalizzato — upsert da domain object (shape types/lean-event).
 * Child tables: replace-all (hotel, ECM, fees, messages, hospitality, …).
 */

import { randomUUID } from "node:crypto";

import type { LeanEventManagedEntityType } from "@/lib/lean-event/entity-lifecycle";
import {
  getLeanEventSql,
  isLeanEventDatabaseEnabled,
  isLeanEventDatabaseStrict,
} from "@/lib/lean-event/db";
import { isLeanEventNormalizedSot } from "@/lib/lean-event/normalized-flags";
import {
  syncAssignmentChildren,
  syncEventChatChildren,
  syncEventChildren,
  syncSupplierChildren,
  syncSupplierLinkChildren,
  syncTeresaChildren,
  syncWorkspaceChildren,
} from "@/lib/lean-event/normalized/write-children";

export interface NormalizedEntityInput {
  id: string;
  tenantId: string;
  revision?: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  purgeAfter?: string | null;
  [key: string]: unknown;
}

function toTs(value: string | null | undefined): string | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

async function report(context: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    JSON.stringify({ lean_event_normalized_error: { context, message } })
  );
  if (isLeanEventDatabaseStrict()) {
    throw error instanceof Error
      ? error
      : new Error(`LEAN_EVENT_NORMALIZED:${context}:${message}`);
  }
}

function asRecord(entity: NormalizedEntityInput): Record<string, unknown> {
  return entity as Record<string, unknown>;
}

/** Scrive su tabelle tipizzate se SoT normalizzato (o sempre se forced). */
export async function upsertNormalizedManagedEntity(
  entityType: LeanEventManagedEntityType,
  entity: NormalizedEntityInput,
  options?: { force?: boolean }
): Promise<void> {
  if (!isLeanEventDatabaseEnabled()) return;
  if (!options?.force && !isLeanEventNormalizedSot()) return;

  const sql = getLeanEventSql();
  if (!sql) return;

  try {
    switch (entityType) {
      case "venue":
        await upsertVenue(sql, entity);
        break;
      case "contact":
        await upsertContact(sql, entity);
        break;
      case "supplier":
        await upsertSupplier(sql, entity);
        break;
      case "event":
        await upsertEvent(sql, entity);
        break;
      case "assignment":
        await upsertAssignment(sql, entity);
        break;
      case "event_supplier_link":
        await upsertSupplierLink(sql, entity);
        break;
      case "workspace":
        await upsertWorkspace(sql, entity);
        break;
      case "event_chat":
        await upsertEventChat(sql, entity);
        break;
      case "teresa_chat":
        await upsertTeresa(sql, entity);
        break;
      default:
        break;
    }
  } catch (error) {
    await report(`upsert:${entityType}:${entity.id}`, error);
  }
}

type Sql = NonNullable<ReturnType<typeof getLeanEventSql>>;

async function upsertVenue(sql: Sql, entity: NormalizedEntityInput) {
  const p = asRecord(entity);
  await sql`
    INSERT INTO lean_event_venues (
      tenant_id, id, name, address, city, province, region, postal_code, country,
      phone, email, website, external_url, cover_image_url, star_category,
      internal_rating, internal_review, notes, revision, created_by, updated_by,
      deleted_at, deleted_by, purge_after, created_at, updated_at
    ) VALUES (
      ${entity.tenantId}, ${entity.id}, ${String(p.name ?? "")}, ${String(p.address ?? "")},
      ${String(p.city ?? "")}, ${String(p.province ?? "")}, ${(p.region as string) ?? null},
      ${String(p.postalCode ?? "")}, ${(p.country as string) ?? null},
      ${String(p.phone ?? "")}, ${String(p.email ?? "")}, ${String(p.website ?? "")},
      ${String(p.externalUrl ?? "")}, ${String(p.coverImageUrl ?? "")},
      ${String(p.starCategory ?? "")}, ${String(p.internalRating ?? "")},
      ${String(p.internalReview ?? "")}, ${String(p.notes ?? "")},
      ${entity.revision ?? 1}, ${entity.createdBy ?? null}, ${entity.updatedBy ?? null},
      ${toTs(entity.deletedAt)}, ${entity.deletedBy ?? null}, ${toTs(entity.purgeAfter)},
      ${toTs(entity.createdAt) ?? new Date().toISOString()},
      ${toTs(entity.updatedAt) ?? new Date().toISOString()}
    )
    ON CONFLICT (tenant_id, id) DO UPDATE SET
      name = EXCLUDED.name, address = EXCLUDED.address, city = EXCLUDED.city,
      province = EXCLUDED.province, region = EXCLUDED.region,
      postal_code = EXCLUDED.postal_code, country = EXCLUDED.country,
      phone = EXCLUDED.phone, email = EXCLUDED.email, notes = EXCLUDED.notes,
      revision = EXCLUDED.revision, updated_by = EXCLUDED.updated_by,
      deleted_at = EXCLUDED.deleted_at, deleted_by = EXCLUDED.deleted_by,
      purge_after = EXCLUDED.purge_after, updated_at = EXCLUDED.updated_at
  `;
}

async function upsertContact(sql: Sql, entity: NormalizedEntityInput) {
  const p = asRecord(entity);
  await sql`
    INSERT INTO lean_event_contacts (
      tenant_id, id, vocative, honorific_title, first_name, last_name, email,
      fiscal_code, birth_date, address, city, province, region, postal_code, country,
      organization, organization_address, organization_city, organization_province,
      organization_region, organization_postal_code, organization_country, organization_role,
      dietary_notes, mobility_notes, personal_requests, notes, revision, created_by,
      updated_by, deleted_at, deleted_by, purge_after, created_at, updated_at
    ) VALUES (
      ${entity.tenantId}, ${entity.id}, ${(p.vocative as string) ?? null},
      ${(p.honorificTitle as string) ?? null}, ${String(p.firstName ?? "")},
      ${String(p.lastName ?? "")}, ${String(p.email ?? "")},
      ${(p.fiscalCode as string) ?? null}, ${(p.birthDate as string) ?? null},
      ${(p.address as string) ?? null}, ${(p.city as string) ?? null},
      ${(p.province as string) ?? null}, ${(p.region as string) ?? null},
      ${(p.postalCode as string) ?? null}, ${(p.country as string) ?? null},
      ${String(p.organization ?? "")}, ${(p.organizationAddress as string) ?? null},
      ${(p.organizationCity as string) ?? null}, ${(p.organizationProvince as string) ?? null},
      ${(p.organizationRegion as string) ?? null}, ${(p.organizationPostalCode as string) ?? null},
      ${(p.organizationCountry as string) ?? null}, ${(p.organizationRole as string) ?? null},
      ${(p.dietaryNotes as string) ?? null}, ${(p.mobilityNotes as string) ?? null},
      ${(p.personalRequests as string) ?? null}, ${String(p.notes ?? "")},
      ${entity.revision ?? 1}, ${entity.createdBy ?? null}, ${entity.updatedBy ?? null},
      ${toTs(entity.deletedAt)}, ${entity.deletedBy ?? null}, ${toTs(entity.purgeAfter)},
      ${toTs(entity.createdAt) ?? new Date().toISOString()},
      ${toTs(entity.updatedAt) ?? new Date().toISOString()}
    )
    ON CONFLICT (tenant_id, id) DO UPDATE SET
      first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name,
      email = EXCLUDED.email, organization = EXCLUDED.organization, notes = EXCLUDED.notes,
      revision = EXCLUDED.revision, updated_by = EXCLUDED.updated_by,
      deleted_at = EXCLUDED.deleted_at, updated_at = EXCLUDED.updated_at
  `;

  await sql`DELETE FROM lean_event_contact_emails WHERE tenant_id = ${entity.tenantId} AND contact_id = ${entity.id}`;
  await sql`DELETE FROM lean_event_contact_phones WHERE tenant_id = ${entity.tenantId} AND contact_id = ${entity.id}`;
  await sql`DELETE FROM lean_event_contact_tags WHERE tenant_id = ${entity.tenantId} AND contact_id = ${entity.id}`;

  const emails = Array.isArray(p.emails) ? p.emails : [];
  for (const [i, email] of emails.entries()) {
    const e = email as { id?: string; label?: string; address?: string };
    await sql`
      INSERT INTO lean_event_contact_emails (tenant_id, contact_id, id, label, address, sort_order)
      VALUES (
        ${entity.tenantId}, ${entity.id}, ${e.id ?? randomUUID()},
        ${String(e.label ?? "")}, ${String(e.address ?? "")}, ${i}
      )
    `;
  }
  const phones = Array.isArray(p.phones) ? p.phones : [];
  for (const [i, phone] of phones.entries()) {
    const ph = phone as { label?: string; number?: string };
    await sql`
      INSERT INTO lean_event_contact_phones (tenant_id, contact_id, id, label, number, sort_order)
      VALUES (
        ${entity.tenantId}, ${entity.id}, ${randomUUID()},
        ${String(ph.label ?? "")}, ${String(ph.number ?? "")}, ${i}
      )
    `;
  }
  const tags = Array.isArray(p.tags) ? p.tags : [];
  for (const tag of tags) {
    if (!tag) continue;
    await sql`
      INSERT INTO lean_event_contact_tags (tenant_id, contact_id, tag)
      VALUES (${entity.tenantId}, ${entity.id}, ${String(tag)})
      ON CONFLICT DO NOTHING
    `;
  }
}

async function upsertSupplier(sql: Sql, entity: NormalizedEntityInput) {
  const p = asRecord(entity);
  await sql`
    INSERT INTO lean_event_suppliers (
      tenant_id, id, name, category_id, email, phone, address, city, province,
      region, postal_code, country, vat_number, contact_person, notes, revision,
      created_by, updated_by, deleted_at, deleted_by, purge_after, created_at, updated_at
    ) VALUES (
      ${entity.tenantId}, ${entity.id}, ${String(p.name ?? "")}, ${String(p.categoryId ?? "")},
      ${String(p.email ?? "")}, ${String(p.phone ?? "")}, ${String(p.address ?? "")},
      ${String(p.city ?? "")}, ${String(p.province ?? "")}, ${(p.region as string) ?? null},
      ${(p.postalCode as string) ?? null}, ${(p.country as string) ?? null},
      ${String(p.vatNumber ?? "")}, ${String(p.contactPerson ?? "")}, ${String(p.notes ?? "")},
      ${entity.revision ?? 1}, ${entity.createdBy ?? null}, ${entity.updatedBy ?? null},
      ${toTs(entity.deletedAt)}, ${entity.deletedBy ?? null}, ${toTs(entity.purgeAfter)},
      ${toTs(entity.createdAt) ?? new Date().toISOString()},
      ${toTs(entity.updatedAt) ?? new Date().toISOString()}
    )
    ON CONFLICT (tenant_id, id) DO UPDATE SET
      name = EXCLUDED.name, category_id = EXCLUDED.category_id, email = EXCLUDED.email,
      revision = EXCLUDED.revision, deleted_at = EXCLUDED.deleted_at, updated_at = EXCLUDED.updated_at
  `;
  await syncSupplierChildren(sql, entity.tenantId, entity.id, p);
}

async function upsertEvent(sql: Sql, entity: NormalizedEntityInput) {
  const p = asRecord(entity);
  const vd = (p.venueDetails as Record<string, unknown> | undefined) ?? {};
  const reg = (p.registration as Record<string, unknown> | undefined) ?? {};
  let venueId = (p.venueId as string | null | undefined) || null;
  if (venueId) {
    const exists = await sql`
      SELECT 1 FROM lean_event_venues
      WHERE tenant_id = ${entity.tenantId} AND id = ${venueId} LIMIT 1
    `;
    if (!exists.length) venueId = null;
  }

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
      ${entity.tenantId}, ${entity.id}, ${String(p.createdBy ?? entity.createdBy ?? "")},
      ${String(p.cdc ?? "")}, ${String(p.title ?? "")}, ${String(p.venue ?? "")}, ${venueId},
      ${(vd.name as string) ?? null}, ${(vd.address as string) ?? null},
      ${(vd.city as string) ?? null}, ${(vd.province as string) ?? null},
      ${(vd.region as string) ?? null}, ${(vd.postalCode as string) ?? null},
      ${(vd.country as string) ?? null}, ${Boolean(vd.isOnline)},
      ${(vd.onlineUrl as string) ?? null}, ${(vd.notes as string) ?? null},
      ${String(p.startDate ?? "")}, ${String(p.endDate ?? "")}, ${String(p.categoryId ?? "")},
      ${(p.healthAreaId as string) ?? null},
      ${typeof p.ecmEnabled === "boolean" ? p.ecmEnabled : null},
      ${(p.ecmModality as string) ?? null}, ${(p.formationEventTypeId as string) ?? null},
      ${(p.formationStructureName as string) ?? null}, ${(p.type as string) ?? null},
      ${String(p.status ?? "draft")}, ${String(p.notes ?? "")}, ${Boolean(p.isFavorite)},
      ${(p.projectLeaderUserId as string) ?? null},
      ${typeof reg.paid === "boolean" ? reg.paid : null},
      ${typeof reg.refundsEnabled === "boolean" ? reg.refundsEnabled : null},
      ${String(reg.refundRules ?? "")}, ${entity.revision ?? 1}, ${entity.updatedBy ?? null},
      ${toTs(entity.deletedAt)}, ${entity.deletedBy ?? null}, ${toTs(entity.purgeAfter)},
      ${toTs(entity.createdAt) ?? new Date().toISOString()},
      ${toTs(entity.updatedAt) ?? new Date().toISOString()}
    )
    ON CONFLICT (tenant_id, id) DO UPDATE SET
      title = EXCLUDED.title, cdc = EXCLUDED.cdc, venue_id = EXCLUDED.venue_id,
      start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date,
      status = EXCLUDED.status, is_favorite = EXCLUDED.is_favorite,
      revision = EXCLUDED.revision, deleted_at = EXCLUDED.deleted_at,
      updated_at = EXCLUDED.updated_at, notes = EXCLUDED.notes
  `;
  await syncEventChildren(sql, entity.tenantId, entity.id, p);
}

async function upsertAssignment(sql: Sql, entity: NormalizedEntityInput) {
  const p = asRecord(entity);
  const eventId = String(p.eventId ?? "");
  const contactId = String(p.contactId ?? "");
  if (!eventId || !contactId) return;

  await sql`
    INSERT INTO lean_event_assignments (
      tenant_id, id, event_id, contact_id, role_category, notes, revision,
      updated_by, deleted_at, deleted_by, purge_after, created_at, updated_at
    ) VALUES (
      ${entity.tenantId}, ${entity.id}, ${eventId}, ${contactId},
      ${String(p.roleCategory ?? "")}, ${String(p.notes ?? "")}, ${entity.revision ?? 1},
      ${entity.updatedBy ?? null}, ${toTs(entity.deletedAt)}, ${entity.deletedBy ?? null},
      ${toTs(entity.purgeAfter)},
      ${toTs(entity.createdAt) ?? new Date().toISOString()},
      ${toTs(entity.updatedAt) ?? new Date().toISOString()}
    )
    ON CONFLICT (tenant_id, id) DO UPDATE SET
      role_category = EXCLUDED.role_category, notes = EXCLUDED.notes,
      revision = EXCLUDED.revision, deleted_at = EXCLUDED.deleted_at,
      updated_at = EXCLUDED.updated_at
  `;
  await syncAssignmentChildren(sql, entity.tenantId, entity.id, p);
}

async function upsertSupplierLink(sql: Sql, entity: NormalizedEntityInput) {
  const p = asRecord(entity);
  await sql`
    INSERT INTO lean_event_event_supplier_links (
      tenant_id, id, event_id, supplier_id, category_id, role_notes, revision,
      updated_by, deleted_at, deleted_by, purge_after, created_at, updated_at
    ) VALUES (
      ${entity.tenantId}, ${entity.id}, ${String(p.eventId ?? "")}, ${String(p.supplierId ?? "")},
      ${String(p.categoryId ?? "")}, ${String(p.roleNotes ?? "")}, ${entity.revision ?? 1},
      ${entity.updatedBy ?? null}, ${toTs(entity.deletedAt)}, ${entity.deletedBy ?? null},
      ${toTs(entity.purgeAfter)},
      ${toTs(entity.createdAt) ?? new Date().toISOString()},
      ${toTs(entity.updatedAt) ?? new Date().toISOString()}
    )
    ON CONFLICT (tenant_id, id) DO UPDATE SET
      category_id = EXCLUDED.category_id, role_notes = EXCLUDED.role_notes,
      revision = EXCLUDED.revision, deleted_at = EXCLUDED.deleted_at,
      updated_at = EXCLUDED.updated_at
  `;
  await syncSupplierLinkChildren(sql, entity.tenantId, entity.id, p);
}

async function upsertWorkspace(sql: Sql, entity: NormalizedEntityInput) {
  const p = asRecord(entity);
  let linked = (p.linkedEventId as string | null) || null;
  if (linked) {
    const exists = await sql`
      SELECT 1 FROM lean_event_events
      WHERE tenant_id = ${entity.tenantId} AND id = ${linked} LIMIT 1
    `;
    if (!exists.length) linked = null;
  }
  await sql`
    INSERT INTO lean_event_workspaces (
      tenant_id, id, created_by, title, client, organization, meeting_date, meeting_type,
      participants, moderator, secretary, notes, linked_event_id, status, transcript,
      structured, error_message, revision, updated_by, deleted_at, deleted_by, purge_after,
      created_at, updated_at
    ) VALUES (
      ${entity.tenantId}, ${entity.id}, ${String(p.createdBy ?? entity.createdBy ?? "")},
      ${String(p.title ?? "")}, ${String(p.client ?? "")}, ${String(p.organization ?? "")},
      ${String(p.meetingDate ?? "")}, ${String(p.meetingType ?? "internal_meeting")},
      ${String(p.participants ?? "")}, ${String(p.moderator ?? "")}, ${String(p.secretary ?? "")},
      ${String(p.notes ?? "")}, ${linked}, ${String(p.status ?? "draft")},
      ${String(p.transcript ?? "")}, ${p.structured ?? null},
      ${(p.errorMessage as string) ?? null}, ${entity.revision ?? 1}, ${entity.updatedBy ?? null},
      ${toTs(entity.deletedAt)}, ${entity.deletedBy ?? null}, ${toTs(entity.purgeAfter)},
      ${toTs(entity.createdAt) ?? new Date().toISOString()},
      ${toTs(entity.updatedAt) ?? new Date().toISOString()}
    )
    ON CONFLICT (tenant_id, id) DO UPDATE SET
      title = EXCLUDED.title, status = EXCLUDED.status, transcript = EXCLUDED.transcript,
      structured = EXCLUDED.structured, revision = EXCLUDED.revision,
      deleted_at = EXCLUDED.deleted_at, updated_at = EXCLUDED.updated_at
  `;
  await syncWorkspaceChildren(sql, entity.tenantId, entity.id, p);
}

async function upsertEventChat(sql: Sql, entity: NormalizedEntityInput) {
  const p = asRecord(entity);
  const eventId = String(p.eventId ?? "");
  await sql`
    INSERT INTO lean_event_event_chat_threads (
      tenant_id, id, event_id, revision, updated_by, deleted_at, deleted_by,
      purge_after, created_at, updated_at
    ) VALUES (
      ${entity.tenantId}, ${entity.id}, ${eventId}, ${entity.revision ?? 1},
      ${entity.updatedBy ?? null}, ${toTs(entity.deletedAt)}, ${entity.deletedBy ?? null},
      ${toTs(entity.purgeAfter)},
      ${toTs(entity.createdAt) ?? new Date().toISOString()},
      ${toTs(entity.updatedAt) ?? new Date().toISOString()}
    )
    ON CONFLICT (tenant_id, id) DO UPDATE SET
      revision = EXCLUDED.revision, updated_at = EXCLUDED.updated_at,
      deleted_at = EXCLUDED.deleted_at
  `;
  await syncEventChatChildren(sql, entity.tenantId, entity.id, eventId, p);
}

async function upsertTeresa(sql: Sql, entity: NormalizedEntityInput) {
  const p = asRecord(entity);
  await sql`
    INSERT INTO lean_event_teresa_chat_threads (
      tenant_id, id, user_id, user_email, user_name, title, revision, updated_by,
      deleted_at, deleted_by, purge_after, created_at, updated_at
    ) VALUES (
      ${entity.tenantId}, ${entity.id}, ${String(p.userId ?? "")}, ${String(p.userEmail ?? "")},
      ${String(p.userName ?? "")}, ${(p.title as string) ?? null}, ${entity.revision ?? 1},
      ${entity.updatedBy ?? null}, ${toTs(entity.deletedAt)}, ${entity.deletedBy ?? null},
      ${toTs(entity.purgeAfter)},
      ${toTs(entity.createdAt) ?? new Date().toISOString()},
      ${toTs(entity.updatedAt) ?? new Date().toISOString()}
    )
    ON CONFLICT (tenant_id, id) DO UPDATE SET
      title = EXCLUDED.title, revision = EXCLUDED.revision, updated_at = EXCLUDED.updated_at
  `;
  await syncTeresaChildren(sql, entity.tenantId, entity.id, p);
}
