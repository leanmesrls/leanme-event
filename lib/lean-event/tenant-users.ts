import { findTenantBySlug } from "@/lib/lean-event/auth";
import { loadTenantsFile } from "@/lib/lean-event/storage";
import type {
  LeanEventTenantUserPublic,
  LeanEventUser,
} from "@/types/lean-event";

export {
  formatEventProjectRif,
  formatTenantUserLabel,
  resolveEventVenueCity,
  sanitizeEventProjectTeam,
  sortTenantUsers,
  tenantUserMatchesQuery,
} from "@/lib/lean-event/tenant-users-display";

export function toPublicTenantUser(user: LeanEventUser): LeanEventTenantUserPublic {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    name: user.name,
    role: user.role,
  };
}

export async function listPublicTenantUsersByTenantId(
  tenantId: string
): Promise<LeanEventTenantUserPublic[]> {
  const data = await loadTenantsFile();
  const tenant = data.tenants.find((entry) => entry.id === tenantId);
  if (!tenant) {
    return [];
  }
  return tenant.users.map(toPublicTenantUser);
}

export async function listPublicTenantUsersBySlug(
  tenantSlug: string
): Promise<LeanEventTenantUserPublic[]> {
  const tenant = await findTenantBySlug(tenantSlug);
  if (!tenant) {
    return [];
  }
  return tenant.users.map(toPublicTenantUser);
}
