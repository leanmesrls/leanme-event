/** In-memory guard against parallel duplicate creates (dev Strict Mode / double click). */
export const contactCreateLocks = new Set<string>();

export function contactCreateLockKey(tenantId: string, email: string): string {
  return `${tenantId}:${email.trim().toLowerCase()}`;
}
