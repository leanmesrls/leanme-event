"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { useLeonardoWorkTabs } from "@/components/lean-event/LeonardoWorkTabsContext";
import { resolveSectionListFromPath } from "@/lib/lean-event/work-tabs";

/**
 * Al cambio sezione: registra l'elenco visitato (Eventi, Contatti…) e mostra
 * il list panel della route corrente, tenendo aperte le tab entità.
 */
export function LeonardoWorkTabsRouteSync({
  tenantSlug,
}: {
  tenantSlug: string;
}) {
  const pathname = usePathname();
  const { focusList, touchSectionList } = useLeonardoWorkTabs();

  useEffect(() => {
    const section = resolveSectionListFromPath(pathname, tenantSlug);
    if (section) {
      touchSectionList(section);
    }
    focusList();
  }, [pathname, tenantSlug, focusList, touchSectionList]);

  return null;
}
