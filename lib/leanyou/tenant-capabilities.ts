import capabilityPresetsData from "@/data/leanyou/tenant-capability-presets.json";

import type {
  LeanYouLeonardoCapabilities,
  LeanYouTenant,
} from "@/types/leanyou";

import {
  emptyLeonardoCapabilities,
  fullLeonardoCapabilities,
  type LeonardoCapabilityKey,
} from "./capabilities-core";

export type LeanYouTenantProfile = "showcase" | "client";

type CapabilityPresetFile = Record<
  string,
  {
    label: string;
    capabilities: Partial<LeanYouLeonardoCapabilities>;
  }
>;

const capabilityPresets = capabilityPresetsData as CapabilityPresetFile;

export function isShowcaseTenant(tenant: Pick<LeanYouTenant, "profile" | "slug">): boolean {
  return tenant.profile === "showcase" || tenant.slug === "demo";
}

export function listCapabilityPresets(): Array<{
  id: string;
  label: string;
  capabilities: Partial<LeanYouLeonardoCapabilities>;
}> {
  return Object.entries(capabilityPresets).map(([id, preset]) => ({
    id,
    label: preset.label,
    capabilities: preset.capabilities,
  }));
}

const SLUG_CAPABILITY_PRESET: Record<string, string> = {
  iec: "iec_pilot",
};

export function resolveCapabilityPresetForTenant(
  tenant: Pick<LeanYouTenant, "slug" | "capabilityPreset">
): string | undefined {
  return tenant.capabilityPreset ?? SLUG_CAPABILITY_PRESET[tenant.slug];
}

export function resolvePresetCapabilities(
  presetId: string | undefined
): Partial<LeanYouLeonardoCapabilities> | null {
  if (!presetId) {
    return null;
  }
  return capabilityPresets[presetId]?.capabilities ?? null;
}

function applyCapabilityPatch(
  base: LeanYouLeonardoCapabilities,
  patch: Partial<LeanYouLeonardoCapabilities> | null | undefined
): LeanYouLeonardoCapabilities {
  if (!patch) {
    return base;
  }

  const next = { ...base };
  for (const key of Object.keys(patch) as LeonardoCapabilityKey[]) {
    const value = patch[key];
    if (value !== undefined) {
      next[key] = value;
    }
  }
  return next;
}

export function resolveLeonardoCapabilities(
  tenant: LeanYouTenant
): LeanYouLeonardoCapabilities {
  if (isShowcaseTenant(tenant)) {
    return fullLeonardoCapabilities();
  }

  let capabilities = emptyLeonardoCapabilities();
  capabilities = applyCapabilityPatch(
    capabilities,
    resolvePresetCapabilities(resolveCapabilityPresetForTenant(tenant))
  );
  capabilities = applyCapabilityPatch(capabilities, tenant.leonardoCapabilities);
  return capabilities;
}
