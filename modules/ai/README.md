# Module: AI

## Responsibility

AI Gateway, providers, Assistant Registry, meeting-minutes and related capabilities.

## Dependencies

Core infrastructure (tenant context, jobs contract).

## Database

Tenant DB tables for meeting-minutes workspaces (never Control Plane operational content).

## API

- `/api/v1/lean-event/ai/meeting-minutes`
- `/api/v1/lean-event/ai/content-generation`

## Domain events

`MeetingMinutesRequested`, `ContentGenerationRequested`

## Related

Assistant profiles use technical IDs only. Commercial names are display config.

## Roadmap

Additional capabilities activate via Module Registry + pack.
