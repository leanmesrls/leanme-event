# Lean.Event — Design Principles (Technical Constitution)

1. Maintainable without Cursor or any specific IDE.
2. Repository holds all critical knowledge.
3. Documentation is the technical contract.
4. Prefer clarity over cleverness.
5. No magic; explicit resolvers and contracts.
6. Single responsibility; small Core.
7. Modules independent; Core never imports module internals.
8. Commercial agent names are never technical identifiers.
9. Fail-closed for tenant/DB/storage/AI resolution.
10. Five-year test: would a new developer understand and extend this with 500 tenants?

If a request violates these principles, stop and propose an alternative.
