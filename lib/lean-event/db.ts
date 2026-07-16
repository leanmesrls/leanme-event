/**
 * Lean Event · Postgres (Neon) client.
 * Senza `LEAN_EVENT_DATABASE_URL` / `DATABASE_URL` → null (solo Blob/FS).
 */

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

import { readLeanEventEnv } from "@/lib/lean-event/env";

export function readLeanEventDatabaseUrl(): string | undefined {
  return (
    readLeanEventEnv("LEAN_EVENT_DATABASE_URL", "DATABASE_URL") ?? undefined
  );
}

/** True quando Neon è configurato. */
export function isLeanEventDatabaseEnabled(): boolean {
  return Boolean(readLeanEventDatabaseUrl());
}

type Sql = NeonQueryFunction<false, false>;

let cachedSql: Sql | null | undefined;

/**
 * Client SQL Neon (HTTP pooled). Cache per cold start.
 * Restituisce null se nessun DATABASE_URL.
 */
export function getLeanEventSql(): Sql | null {
  const url = readLeanEventDatabaseUrl();
  if (!url) {
    cachedSql = null;
    return null;
  }
  if (cachedSql === undefined || cachedSql === null) {
    cachedSql = neon(url);
  }
  return cachedSql;
}

/** Se true (default quando DB enabled), un fallimento Neon fallisce la mutazione. */
export function isLeanEventDatabaseStrict(): boolean {
  const raw = readLeanEventEnv("LEAN_EVENT_DB_STRICT");
  if (raw === "0" || raw === "false") {
    return false;
  }
  return isLeanEventDatabaseEnabled();
}

/**
 * Cutover Fase B: letture da Neon invece di Blob/FS.
 * Richiede `LEAN_EVENT_READ_FROM_NEON=1` e `LEAN_EVENT_DATABASE_URL`.
 * Default: off (Blob resta source of truth finché non abiliti esplicitamente).
 */
export function isLeanEventReadFromNeon(): boolean {
  const raw = readLeanEventEnv("LEAN_EVENT_READ_FROM_NEON");
  if (raw === "1" || raw === "true") {
    return isLeanEventDatabaseEnabled();
  }
  return false;
}
