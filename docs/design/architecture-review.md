# Architecture Review Procedure

At every significant milestone (v1.0, v1.5, v2.0, …):

1. Core still small and coherent?
2. Modules independent; no illegal Core→module imports?
3. No commercial agent names in technical layer?
4. Tenant DB + storage isolation intact?
5. Resolvers fail-closed?
6. Docs aligned with code?
7. Technical debt logged?
8. Security / DR / backups verified?

Outcome recorded under `docs/design/reviews/`.
