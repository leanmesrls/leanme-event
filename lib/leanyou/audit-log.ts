import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

import type { LeanYouSession } from "@/types/leanyou";

import { getDataRoot } from "@/lib/leanyou/storage";

export type LeanYouAuditAction =
  | "login_success"
  | "login_failed"
  | "logout"
  | "workspace_create"
  | "workspace_delete"
  | "workspace_update"
  | "workspace_process_start"
  | "workspace_process_complete"
  | "workspace_process_failed"
  | "workspace_transcribe";

export interface LeanYouAuditEvent {
  ts: string;
  action: LeanYouAuditAction;
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
  session: LeanYouSession
): Pick<
  LeanYouAuditEvent,
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
  // Vercel serverless has a read-only filesystem outside /tmp.
  if (process.env.VERCEL === "1") {
    return false;
  }
  return true;
}

export async function writeLeanYouAuditEvent(
  event: Omit<LeanYouAuditEvent, "ts"> & { ts?: string }
): Promise<void> {
  const record: LeanYouAuditEvent = {
    ...event,
    ts: event.ts ?? new Date().toISOString(),
  };

  console.info(JSON.stringify({ leanyou_audit: record }));

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
