"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { LeonardoContactSheetContent } from "@/components/lean-event/LeonardoContactSheetContent";
import { formatContactName } from "@/lib/lean-event/contact-display";
import { leanEventLeonardoContattiPath } from "@/lib/lean-event/paths";
import type { ContactAssignmentWithEvent } from "@/lib/lean-event/event-assignments";
import type { LeanEventContact } from "@/types/lean-event";

interface LeonardoContactDetailProps {
  tenantSlug: string;
  initialContact: LeanEventContact;
  assignments: ContactAssignmentWithEvent[];
}

export function LeonardoContactDetail({
  tenantSlug,
  initialContact,
  assignments,
}: LeonardoContactDetailProps) {
  const router = useRouter();
  const [contact, setContact] = useState({
    ...initialContact,
    tags: initialContact.tags ?? [],
  });
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (
      !window.confirm(
        `Eliminare ${formatContactName(contact)}? Il contatto finirà nel cestino.`
      )
    ) {
      return;
    }
    setDeleting(true);
    const response = await fetch(`/api/lean-event/contacts/${contact.id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    setDeleting(false);
    if (!response.ok) {
      return;
    }
    router.push(leanEventLeonardoContattiPath(tenantSlug));
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
            Contatto
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white">
            {formatContactName(contact)}
          </h1>
        </div>
        <Link
          href={leanEventLeonardoContattiPath(tenantSlug)}
          className="text-xs font-semibold uppercase tracking-[0.08em] text-white/55 hover:text-leanme-fuchsia"
        >
          ← Rubrica
        </Link>
      </div>

      <LeonardoContactSheetContent
        tenantSlug={tenantSlug}
        contact={contact}
        onContactChange={setContact}
        assignments={assignments}
        onDelete={() => {
          void handleDelete();
        }}
        deleting={deleting}
        mode="edit"
      />
    </div>
  );
}
