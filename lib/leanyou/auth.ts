import bcrypt from "bcryptjs";

import type {
  LeanYouSession,
  LeanYouTenant,
  LeanYouUser,
} from "@/types/leanyou";

import { getSessionLeonardoCapabilities } from "./capabilities";
import { loadTenantsFile } from "./storage";

export async function findTenantBySlug(
  slug: string
): Promise<LeanYouTenant | null> {
  const data = await loadTenantsFile();
  return data.tenants.find((tenant) => tenant.slug === slug) ?? null;
}

export async function findUserByEmail(
  email: string
): Promise<{ tenant: LeanYouTenant; user: LeanYouUser } | null> {
  const data = await loadTenantsFile();
  const normalized = email.trim().toLowerCase();

  for (const tenant of data.tenants) {
    const user = tenant.users.find(
      (entry) => entry.email.trim().toLowerCase() === normalized
    );
    if (user) {
      return { tenant, user };
    }
  }

  return null;
}

export async function findUserByToken(
  token: string
): Promise<{ tenant: LeanYouTenant; user: LeanYouUser | null } | null> {
  const data = await loadTenantsFile();
  const normalized = token.trim();

  for (const tenant of data.tenants) {
    if (tenant.accessToken === normalized) {
      const admin =
        tenant.users.find((user) => user.role === "admin") ?? tenant.users[0];
      return { tenant, user: admin ?? null };
    }

    const user = tenant.users.find((entry) => entry.accessToken === normalized);
    if (user) {
      return { tenant, user };
    }
  }

  return null;
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  if (
    passwordHash.startsWith("REPLACE_") ||
    passwordHash.length < 20
  ) {
    return false;
  }

  return bcrypt.compare(password, passwordHash);
}

export function formatLeanYouUserName(user: LeanYouUser): string {
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  return fullName || user.name;
}

export function createSessionPayload(
  tenant: LeanYouTenant,
  user: LeanYouUser
): LeanYouSession {
  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    tenantSlug: tenant.slug,
    userId: user.id,
    userName: formatLeanYouUserName(user),
    userEmail: user.email,
    userRole: user.role,
    modules: tenant.modules,
    tenantProfile: tenant.profile,
    capabilityPreset: tenant.capabilityPreset,
    leonardoCapabilitiesOverride: tenant.leonardoCapabilities,
  };
}

export function tenantHasModule(
  session: LeanYouSession,
  module: LeanYouSession["modules"][number]
): boolean {
  if (session.modules.includes(module)) {
    return true;
  }

  const capabilities = getSessionLeonardoCapabilities(session);

  if (module === "events") {
    return capabilities.eventi || capabilities.contatti || capabilities.ospiti;
  }

  if (module === "government") {
    return capabilities.government;
  }

  if (module === "leonardo") {
    return capabilities.verbali || capabilities.hub;
  }

  return false;
}

export { tenantHasLeonardoCapability } from "./capabilities";
