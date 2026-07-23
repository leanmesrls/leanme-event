import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

import type { LeanEventSession } from "@/types/lean-event";

import {
  getLeanEventSql,
  isLeanEventDatabaseEnabled,
} from "@/lib/lean-event/db";
import type { LeanEventManagedEntityType } from "@/lib/lean-event/entity-lifecycle";
import { getDataRoot } from "@/lib/lean-event/storage";

export type LeanEventAuditAction =
  | "login_success"
  | "login_failed"
  | "logout"
  | "workspace_create"
  | "workspace_delete"
  | "workspace_update"
  | "workspace_process_start"
  | "workspace_process_complete"
  | "workspace_process_failed"
  | "workspace_transcribe"
  | "entity_create"
  | "entity_update"
  | "entity_soft_delete"
  | "entity_restore"
  | "entity_purge"
  | "document_create"
  | "document_update"
  | "document_soft_delete"
  | "document_restore"
  | "document.create"
  | "document.upload_version"
  | "document.soft_delete"
  | "document.restore"
  | "document.download"
  | "document.purge"
  | "document.legal_hold_on"
  | "document.legal_hold_off"
  | "document.integrity_fail"
  | "document.migration_import"
  | "import_apply"
  | "tenant_export"
  | "version_restore"
  | "backup_blob"
  | "teresa_turn";

export interface LeanEventAuditEvent {
  ts: string;
  action: LeanEventAuditAction;
  tenantId?: string;
  tenantSlug?: string;
  tenantName?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  method?: "email" | "token";
  resourceType?: string;
  resourceId?: string;
  detail?: string;
  ip?: string;
  payload?: Record<string, unknown>;
}

function auditDir(tenantId: string): string {
  return path.join(getDataRoot(), "audit", tenantId);
}

function auditFilePath(tenantId: string): string {
  return path.join(auditDir(tenantId), "events.jsonl");
}

function globalAuditFilePath(): string {
  return path.join(getDataRoot(), "audit", "_global", "events.jsonl");
}

export function auditContextFromSession(
  session: LeanEventSession
): Pick<
  LeanEventAuditEvent,
  "tenantId" | "tenantSlug" | "tenantName" | "userId" | "userEmail" | "userName"
> {
  return {
    tenantId: session.tenantId,
    tenantSlug: session.tenantSlug,
    tenantName: session.tenantName,
    userId: session.userId,
    userEmail: session.userEmail,
    userName: session.userName,
  };
}

export function clientIpFromRequest(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim();
  }
  return request.headers.get("x-real-ip") ?? undefined;
}

function shouldPersistAuditToFile(): boolean {
  if (process.env.LEANYOU_AUDIT_FILE === "false") {
    return false;
  }
  if (process.env.VERCEL === "1") {
    return false;
  }
  return true;
}

async function writeAuditToNeon(record: LeanEventAuditEvent): Promise<void> {
  if (!isLeanEventDatabaseEnabled()) {
    return;
  }
  const sql = getLeanEventSql();
  if (!sql) {
    return;
  }

  try {
    await sql`
      INSERT INTO lean_event_audit_events (
        ts, tenant_id, action, user_id, user_email,
        resource_type, resource_id, detail, ip, payload
      ) VALUES (
        ${record.ts}::timestamptz,
        ${record.tenantId ?? null},
        ${record.action},
        ${record.userId ?? null},
        ${record.userEmail ?? null},
        ${record.resourceType ?? null},
        ${record.resourceId ?? null},
        ${record.detail ?? null},
        ${record.ip ?? null},
        ${JSON.stringify(record.payload ?? {})}::jsonb
      )
    `;
  } catch (error) {
    console.warn(
      JSON.stringify({
        lean_event_audit_neon_failed: {
          message: error instanceof Error ? error.message : String(error),
          action: record.action,
        },
      })
    );
  }
}

export async function writeLeanEventAuditEvent(
  event: Omit<LeanEventAuditEvent, "ts"> & { ts?: string }
): Promise<void> {
  const record: LeanEventAuditEvent = {
    ...event,
    ts: event.ts ?? new Date().toISOString(),
  };

  console.info(JSON.stringify({ leanyou_audit: record }));

  await writeAuditToNeon(record);

  if (!shouldPersistAuditToFile()) {
    return;
  }

  const tenantId = record.tenantId ?? "_global";
  const filePath =
    tenantId === "_global"
      ? globalAuditFilePath()
      : auditFilePath(tenantId);

  try {
    await mkdir(path.dirname(filePath), { recursive: true });
    await appendFile(filePath, `${JSON.stringify(record)}\n`, "utf8");
  } catch (error) {
    console.warn(
      JSON.stringify({
        leanyou_audit_write_failed: {
          filePath,
          message: error instanceof Error ? error.message : String(error),
        },
      })
    );
  }
}

/** Audit mutazione entità gestita (create/update/soft-delete/restore). */
export async function auditManagedEntityMutation(input: {
  tenantId: string;
  entityType: LeanEventManagedEntityType;
  entityId: string;
  action:
    | "entity_create"
    | "entity_update"
    | "entity_soft_delete"
    | "entity_restore";
  userId?: string;
  detail?: string;
}): Promise<void> {
  await writeLeanEventAuditEvent({
    action: input.action,
    tenantId: input.tenantId,
    userId: input.userId,
    resourceType: input.entityType,
    resourceId: input.entityId,
    detail: input.detail,
  });
}

export function resolveEntityAuditAction(
  previous: { deletedAt?: string | null } | null,
  next: { deletedAt?: string | null }
): "entity_create" | "entity_update" | "entity_soft_delete" | "entity_restore" {
  if (!previous) {
    return "entity_create";
  }
  const wasDeleted = Boolean(previous.deletedAt);
  const isDeleted = Boolean(next.deletedAt);
  if (!wasDeleted && isDeleted) {
    return "entity_soft_delete";
  }
  if (wasDeleted && !isDeleted) {
    return "entity_restore";
  }
  return "entity_update";
}
