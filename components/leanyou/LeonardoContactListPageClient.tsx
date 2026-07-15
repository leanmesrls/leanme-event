"use client";

import { useSearchParams } from "next/navigation";

import { LeonardoContactList } from "@/components/leanyou/LeonardoContactList";
import type { LeanYouContact } from "@/types/leanyou";

interface LeonardoContactListPageClientProps {
  tenantSlug: string;
  initialContacts: LeanYouContact[];
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
