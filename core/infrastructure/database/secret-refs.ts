/**
 * Resolve secret references for Lean.Event infrastructure.
 * Fail-closed: missing refs throw; no legacy product secret fallbacks.
 */

export class LeanEventSecretError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeanEventSecretError";
  }
}

export function resolveEnvSecret(ref: string): string {
  const key = ref.trim();
  if (!key) {
    throw new LeanEventSecretError("Empty secret reference");
  }

  // Direct env var name, e.g. LEAN_EVENT_TENANT_IEC_DATABASE_URL
  if (/^[A-Z][A-Z0-9_]+$/.test(key)) {
    const value = process.env[key]?.trim();
    if (!value) {
      throw new LeanEventSecretError(`Secret env missing: ${key}`);
    }
    return value;
  }

  // env:NAME form
  if (key.startsWith("env:")) {
    const envName = key.slice(4);
    const value = process.env[envName]?.trim();
    if (!value) {
      throw new LeanEventSecretError(`Secret env missing: ${envName}`);
    }
    return value;
  }

  throw new LeanEventSecretError(`Unsupported secret reference format: ${key}`);
}

export function requireControlPlaneDatabaseUrl(): string {
  const value = process.env.LEAN_EVENT_CONTROL_PLANE_DATABASE_URL?.trim();
  if (!value) {
    throw new LeanEventSecretError(
      "LEAN_EVENT_CONTROL_PLANE_DATABASE_URL is required (fail-closed)"
    );
  }
  return value;
}
