/** Reads LEAN_EVENT_* with fallback to legacy LEANYOU_* (migration). */
export function readLeanEventEnv(primary: string, legacy?: string): string | undefined {
  const primaryValue = process.env[primary]?.trim();
  if (primaryValue) {
    return primaryValue;
  }
  if (legacy) {
    const legacyValue = process.env[legacy]?.trim();
    if (legacyValue) {
      return legacyValue;
    }
  }
  return undefined;
}

export function readLeanEventDataDir(): string {
  return (
    readLeanEventEnv("LEAN_EVENT_DATA_DIR", "LEANYOU_DATA_DIR") ??
    (process.env.VERCEL === "1" ? "/tmp/.lean-event-data" : ".lean-event-data")
  );
}

export function readLeanEventTenantsFile(dataRoot: string): string {
  return (
    readLeanEventEnv("LEAN_EVENT_TENANTS_FILE", "LEANYOU_TENANTS_FILE") ??
    `${dataRoot}/tenants.json`
  );
}

export function readLeanEventTenantsJson(): string | undefined {
  return readLeanEventEnv("LEAN_EVENT_TENANTS_JSON", "LEANYOU_TENANTS_JSON");
}

export function readLeanEventSessionSecret(): string {
  return (
    readLeanEventEnv("LEAN_EVENT_SESSION_SECRET", "LEANYOU_SESSION_SECRET") ??
    process.env.NEXTAUTH_SECRET ??
    "dev-only-change-me-before-production"
  );
}
