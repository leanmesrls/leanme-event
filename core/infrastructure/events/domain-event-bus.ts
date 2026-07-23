import { randomUUID } from "node:crypto";

import type {
  LeanEventDomainEvent,
  LeanEventDomainEventBus,
  LeanEventDomainEventName,
} from "@/contracts/domain-events";
import type { NeonQueryFunction } from "@neondatabase/serverless";

type Handler = (event: LeanEventDomainEvent) => Promise<void>;

const handlers = new Map<LeanEventDomainEventName, Handler[]>();

export function createDomainEventBus(
  tenantSql: NeonQueryFunction<false, false>
): LeanEventDomainEventBus {
  return {
    subscribe(name, handler) {
      const list = handlers.get(name) ?? [];
      list.push(handler);
      handlers.set(name, list);
    },

    async publish(event) {
      await tenantSql`
        INSERT INTO lean_event_domain_events (
          id, name, tenant_id, aggregate_id, correlation_id, actor,
          payload, schema_version, idempotency_key, created_at
        ) VALUES (
          ${event.id},
          ${event.name},
          ${event.tenantId},
          ${event.aggregateId},
          ${event.correlationId},
          ${event.actor},
          ${JSON.stringify(event.payload)}::jsonb,
          ${event.schemaVersion},
          ${event.idempotencyKey},
          ${event.timestamp}::timestamptz
        )
        ON CONFLICT (idempotency_key) DO NOTHING
      `;

      const baseName = event.name.split("@")[0] as LeanEventDomainEventName;
      const list = handlers.get(baseName) ?? [];
      for (const handler of list) {
        try {
          await handler(event as LeanEventDomainEvent);
        } catch (error) {
          await tenantSql`
            INSERT INTO lean_event_domain_event_dead_letters (
              id, event_id, error, created_at
            ) VALUES (
              ${randomUUID()},
              ${event.id},
              ${error instanceof Error ? error.message : String(error)},
              now()
            )
          `;
        }
      }
    },
  };
}

export function buildDomainEvent<T extends Record<string, unknown>>(input: {
  name: LeanEventDomainEventName;
  version?: string;
  tenantId: string;
  aggregateId: string;
  correlationId: string;
  actor: string;
  payload: T;
  idempotencyKey: string;
}): LeanEventDomainEvent<T> {
  const version = input.version ?? "1";
  return {
    name: `${input.name}@${version}`,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    tenantId: input.tenantId,
    aggregateId: input.aggregateId,
    correlationId: input.correlationId,
    actor: input.actor,
    payload: input.payload,
    schemaVersion: version,
    idempotencyKey: input.idempotencyKey,
  };
}
