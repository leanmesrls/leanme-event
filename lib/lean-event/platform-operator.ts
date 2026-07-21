import type { LeanEventSession } from "@/types/lean-event";

/**
 * Operatore piattaforma LeanMe — supervisione globale cross-tenant.
 * Se `LEAN_EVENT_PLATFORM_ADMIN_EMAILS` è impostata (CSV), solo quelle email;
 * altrimenti qualsiasi indirizzo `@leanme.it`.
 *
 * Safe for client components (no Node/fs deps).
 */
export function isLeanMePlatformOperator(session: LeanEventSession): boolean {
  const email = session.userEmail.trim().toLowerCase();
  if (!email) {
    return false;
  }

  const allowlist = (process.env.LEAN_EVENT_PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length > 0) {
    return allowlist.includes(email);
  }

  return email.endsWith("@leanme.it");
}
