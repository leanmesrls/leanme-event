"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { useLeonardoWorkTabs } from "@/components/lean-event/LeonardoWorkTabsContext";

/** Torna all'elenco al cambio sezione sidebar, tenendo le tab aperte. */
export function LeonardoWorkTabsRouteSync() {
  const pathname = usePathname();
  const { focusList } = useLeonardoWorkTabs();

  useEffect(() => {
    focusList();
  }, [pathname, focusList]);

  return null;
}
