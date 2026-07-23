export type LeanEventDomainEventName =
  | "EventCreated"
  | "EventUpdated"
  | "ParticipantRegistered"
  | "ParticipantCheckedIn"
  | "BudgetUpdated"
  | "DocumentUploaded"
  | "CommunicationRequested"
  | "MeetingMinutesRequested"
  | "ContentGenerationRequested"
  | "ModuleActivated";

export interface LeanEventDomainEvent<TPayload = Record<string, unknown>> {
  name: `${LeanEventDomainEventName}@${string}`;
  id: string;
  timestamp: string;
  tenantId: string;
  aggregateId: string;
  correlationId: string;
  actor: string;
  payload: TPayload;
  schemaVersion: string;
  idempotencyKey: string;
}

export interface LeanEventDomainEventBus {
  publish<T>(event: LeanEventDomainEvent<T>): Promise<void>;
  subscribe(
    name: LeanEventDomainEventName,
    handler: (event: LeanEventDomainEvent) => Promise<void>
  ): void;
}
