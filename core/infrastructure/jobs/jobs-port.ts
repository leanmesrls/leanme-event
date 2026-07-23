import { randomUUID } from "node:crypto";

import type {
  LeanEventJobEnqueueInput,
  LeanEventJobRecord,
  LeanEventJobsPort,
} from "@/contracts/jobs";
import { getControlPlaneSql } from "@/core/infrastructure/database/control-plane-client";
import { inngest } from "@/core/infrastructure/jobs/inngest-client";

async function upsertJobMetadata(
  record: LeanEventJobRecord,
  payload: Record<string, unknown>
): Promise<void> {
  const sql = getControlPlaneSql();
  await sql`
    INSERT INTO lean_event_platform_jobs (
      job_id, provider_job_id, type, tenant_id, status, progress, error,
      correlation_id, idempotency_key, payload_json, created_at, updated_at, completed_at
    ) VALUES (
      ${record.jobId},
      ${record.providerJobId ?? null},
      ${record.type},
      ${record.tenantId},
      ${record.status},
      ${record.progress},
      ${record.error ?? null},
      ${record.correlationId},
      ${record.idempotencyKey},
      ${JSON.stringify(payload)}::jsonb,
      ${record.createdAt}::timestamptz,
      ${record.updatedAt}::timestamptz,
      ${record.completedAt ?? null}
    )
    ON CONFLICT (idempotency_key) DO UPDATE SET
      updated_at = EXCLUDED.updated_at,
      status = EXCLUDED.status,
      provider_job_id = COALESCE(EXCLUDED.provider_job_id, lean_event_platform_jobs.provider_job_id)
  `;
}

export function createJobsPort(): LeanEventJobsPort {
  return {
    async enqueue(input: LeanEventJobEnqueueInput) {
      const now = new Date().toISOString();
      const jobId = randomUUID();

      const record: LeanEventJobRecord = {
        jobId,
        type: input.type,
        tenantId: input.tenantId,
        status: "queued",
        progress: 0,
        correlationId: input.correlationId,
        idempotencyKey: input.idempotencyKey,
        createdAt: now,
        updatedAt: now,
      };

      await upsertJobMetadata(record, input.payload);

      const sent = await inngest.send({
        name: `lean-event/job.${input.type}`,
        data: {
          jobId,
          tenantId: input.tenantId,
          payload: input.payload,
          correlationId: input.correlationId,
          idempotencyKey: input.idempotencyKey,
          actorUserId: input.actorUserId,
          priority: input.priority ?? 0,
        },
        id: input.idempotencyKey,
      });

      const providerJobId = sent.ids?.[0];
      record.providerJobId = providerJobId;
      record.status = "queued";
      await upsertJobMetadata(record, input.payload);
      return record;
    },

    async get(jobId) {
      const sql = getControlPlaneSql();
      const rows = await sql`
        SELECT * FROM lean_event_platform_jobs WHERE job_id = ${jobId} LIMIT 1
      `;
      const row = rows[0] as
        | {
            job_id: string;
            provider_job_id: string | null;
            type: LeanEventJobRecord["type"];
            tenant_id: string;
            status: LeanEventJobRecord["status"];
            progress: number;
            error: string | null;
            correlation_id: string;
            idempotency_key: string;
            created_at: string;
            updated_at: string;
            completed_at: string | null;
          }
        | undefined;
      if (!row) return null;
      return {
        jobId: row.job_id,
        providerJobId: row.provider_job_id ?? undefined,
        type: row.type,
        tenantId: row.tenant_id,
        status: row.status,
        progress: row.progress,
        error: row.error ?? undefined,
        correlationId: row.correlation_id,
        idempotencyKey: row.idempotency_key,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        completedAt: row.completed_at ?? undefined,
      };
    },

    async cancel(jobId) {
      const sql = getControlPlaneSql();
      await sql`
        UPDATE lean_event_platform_jobs
        SET status = 'cancelled', updated_at = now()
        WHERE job_id = ${jobId}
      `;
    },

    async retry(jobId) {
      const current = await this.get(jobId);
      if (!current) {
        throw new Error(`Job not found: ${jobId}`);
      }
      return this.enqueue({
        type: current.type,
        tenantId: current.tenantId,
        payload: { retryOf: jobId },
        idempotencyKey: `${current.idempotencyKey}:retry:${Date.now()}`,
        correlationId: current.correlationId,
      });
    },
  };
}
