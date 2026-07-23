import { inngest } from "@/core/infrastructure/jobs/inngest-client";
import { getControlPlaneSql } from "@/core/infrastructure/database/control-plane-client";

async function markJob(
  jobId: string,
  status: string,
  progress: number,
  error?: string
) {
  const sql = getControlPlaneSql();
  await sql`
    UPDATE lean_event_platform_jobs
    SET
      status = ${status},
      progress = ${progress},
      error = ${error ?? null},
      updated_at = now(),
      completed_at = CASE WHEN ${status} IN ('completed', 'failed', 'cancelled')
        THEN now() ELSE completed_at END
    WHERE job_id = ${jobId}
  `;
}

export const leanEventJobRunner = inngest.createFunction(
  {
    id: "lean-event-job-runner",
    retries: 3,
    triggers: { event: "lean-event/job.*" },
  },
  async ({ event, step }) => {
    const data =
      event.data && typeof event.data === "object"
        ? (event.data as Record<string, unknown>)
        : {};
    const jobId = String(data.jobId ?? "");
    const eventName = typeof event.name === "string" ? event.name : "";
    const type = eventName.replace("lean-event/job.", "");

    await step.run("mark-running", async () => {
      await markJob(jobId, "running", 1);
    });

    try {
      await step.run("execute", async () => {
        // Domain-specific handlers will be registered per job type.
        // Foundation ensures durable execution + metadata updates.
        if (!jobId) {
          throw new Error("Missing jobId");
        }
        return { type, accepted: true };
      });

      await step.run("mark-completed", async () => {
        await markJob(jobId, "completed", 100);
      });
    } catch (error) {
      await step.run("mark-failed", async () => {
        await markJob(
          jobId,
          "failed",
          100,
          error instanceof Error ? error.message : String(error)
        );
      });
      throw error;
    }
  }
);

export const leanEventInngestFunctions = [leanEventJobRunner];
