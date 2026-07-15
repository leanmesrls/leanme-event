import type { LeanEventSession, LeanEventTenant } from "@/types/lean-event";

export {
  emptyLeonardoCapabilities,
  fullLeonardoCapabilities,
  LEONARDO_UPGRADE_EMAIL,
  LEONARDO_UPGRADE_HINT,
  tenantHasLeanEventAccess,
  type LeonardoCapabilityKey,
} from "./capabilities-core";

export {
  isShowcaseTenant,
  listCapabilityPresets,
  resolveCapabilityPresetForTenant,
  resolveLeonardoCapabilities,
  type LeanEventTenantProfile,
} from "./tenant-capabilities";

import {
  emptyLeonardoCapabilities,
  type LeonardoCapabilityKey,
} from "./capabilities-core";
import {
  isShowcaseTenant,
  resolveCapabilityPresetForTenant,
  resolveLeonardoCapabilities,
} from "./tenant-capabilities";

import { LEONARDO_UPGRADE_EMAIL } from "./capabilities-core";

function tenantFromSession(session: LeanEventSession): LeanEventTenant {
  const profile =
    session.tenantProfile ??
    (isShowcaseTenant({ slug: session.tenantSlug }) ? "showcase" : undefined);

  return {
    id: session.tenantId,
    name: session.tenantName,
    slug: session.tenantSlug,
    accessToken: "",
    modules: session.modules,
    profile,
    capabilityPreset: resolveCapabilityPresetForTenant({
      slug: session.tenantSlug,
      capabilityPreset: session.capabilityPreset,
    }),
    leonardoCapabilities: session.leonardoCapabilitiesOverride,
    users: [],
  };
}

export function getSessionLeonardoCapabilities(
  session: LeanEventSession
): NonNullable<LeanEventSession["leonardoCapabilities"]> {
  const resolved = resolveLeonardoCapabilities(tenantFromSession(session));
  const legacy = session.leonardoCapabilities;

  if (!legacy) {
    return resolved;
  }

  const merged = { ...resolved };
  for (const key of Object.keys(emptyLeonardoCapabilities()) as LeonardoCapabilityKey[]) {
    merged[key] = resolved[key] || legacy[key] === true;
  }
  return merged;
}

export function tenantHasLeonardoCapability(
  session: LeanEventSession,
  capability: keyof NonNullable<LeanEventSession["leonardoCapabilities"]>
): boolean {
  return getSessionLeonardoCapabilities(session)[capability];
}

export function leonardoUpgradeMailto(subject: string): string {
  return `mailto:${LEONARDO_UPGRADE_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
