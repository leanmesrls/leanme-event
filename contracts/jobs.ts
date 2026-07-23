export type LeanEventJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type LeanEventJobType =
  | "tenant.provision"
  | "tenant.migrate"
  | "tenant.backup"
  | "tenant.restore"
  | "tenant.export"
  | "import.bulk"
  | "document.pdf"
  | "document.certificate"
  | "communication.bulk"
  | "ai.transcription"
  | "ai.generation"
  | "media.audio"
  | "media.video";

export interface LeanEventJobEnqueueInput {
  type: LeanEventJobType;
  tenantId: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  correlationId: string;
  priority?: number;
  actorUserId?: string;
}

export interface LeanEventJobRecord {
  jobId: string;
  providerJobId?: string;
  type: LeanEventJobType;
  tenantId: string;
  status: LeanEventJobStatus;
  progress: number;
  error?: string;
  correlationId: string;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface LeanEventJobsPort {
  enqueue(input: LeanEventJobEnqueueInput): Promise<LeanEventJobRecord>;
  get(jobId: string): Promise<LeanEventJobRecord | null>;
  cancel(jobId: string): Promise<void>;
  retry(jobId: string): Promise<LeanEventJobRecord>;
}
