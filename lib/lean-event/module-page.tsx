import { redirect } from "next/navigation";

import { LeonardoModuleComingSoon } from "@/components/lean-event/LeonardoModuleComingSoon";
import { LeonardoModuleUpgradePanel } from "@/components/lean-event/LeonardoModuleUpgradePanel";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
} from "@/lib/lean-event/auth";
import { leanEventLoginPath } from "@/lib/lean-event/paths";
import { getSession } from "@/lib/lean-event/session";
import type { LeanEventLeonardoCapabilities } from "@/types/lean-event";

export async function renderCapabilityModulePage(input: {
  tenantSlug: string;
  capability: keyof LeanEventLeonardoCapabilities;
  title: string;
  subtitle: string;
  packHint?: string;
}) {
  const tenant = await findTenantBySlug(input.tenantSlug);
  if (!tenant) {
    redirect(leanEventLoginPath());
  }

  const session = await getSession();
  if (!session) {
    redirect(leanEventLoginPath());
  }

  const enabled = tenantHasLeonardoCapability(session, input.capability);
  if (!enabled) {
    return (
      <div className="space-y-4">
        <LeonardoModuleUpgradePanel
          moduleLabel={input.title}
          description={`${input.subtitle} Questo blocco non è attivo sull'abbonamento del tenant.`}
        />
      </div>
    );
  }

  return (
    <LeonardoModuleComingSoon
      title={input.title}
      subtitle={input.subtitle}
      packHint={input.packHint}
    />
  );
}
