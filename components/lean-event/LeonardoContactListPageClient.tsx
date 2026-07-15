"use client";

import { useSearchParams } from "next/navigation";

import { LeonardoContactList } from "@/components/lean-event/LeonardoContactList";
import type { LeanEventContact } from "@/types/lean-event";

interface LeonardoContactListPageClientProps {
  tenantSlug: string;
  initialContacts: LeanEventContact[];
  clientiEnabled: boolean;
}

export function LeonardoContactListPageClient({
  tenantSlug,
  initialContacts,
  clientiEnabled,
}: LeonardoContactListPageClientProps) {
  const searchParams = useSearchParams();
  const initialContactId = searchParams.get("contatto");

  return (
    <LeonardoContactList
      tenantSlug={tenantSlug}
      initialContacts={initialContacts}
      clientiEnabled={clientiEnabled}
      initialContactId={initialContactId}
    />
  );
}
