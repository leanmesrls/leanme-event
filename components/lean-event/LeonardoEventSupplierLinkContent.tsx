"use client";

import Link from "next/link";

import { LeonardoCollapsiblePanel } from "@/components/lean-event/LeonardoCollapsiblePanel";
import { LeonardoEventSupplierEmailsSection } from "@/components/lean-event/LeonardoEventSupplierEmailsSection";
import { LeonardoSupplierDocumentsSection } from "@/components/lean-event/LeonardoSupplierDocumentsSection";
import type { EventSupplierWithSupplier } from "@/lib/lean-event/event-suppliers";
import { leanEventLeonardoSupplierSheetPath } from "@/lib/lean-event/paths";
import { getSupplierCategoryLabel } from "@/lib/lean-event/supplier-categories";

interface LeonardoEventSupplierLinkContentProps {
  tenantSlug: string;
  eventId: string;
  link: EventSupplierWithSupplier;
  onLinkChange: (link: EventSupplierWithSupplier) => void;
  onRemove?: () => void;
}

export function LeonardoEventSupplierLinkContent({
  tenantSlug,
  eventId,
  link,
  onLinkChange,
  onRemove,
}: LeonardoEventSupplierLinkContentProps) {
  const docCount = link.documents?.length ?? 0;
  const emailCount = link.emails?.length ?? 0;
  const supplierName = link.supplier?.name ?? "Fornitore rimosso da rubrica";

  return (
    <div className="space-y-4">
      {link.supplier ? (
        <p className="text-sm text-white/60">
          Rubrica:{" "}
          <Link
            href={leanEventLeonardoSupplierSheetPath(tenantSlug, link.supplier.id)}
            className="text-leanme-fuchsia hover:underline"
          >
            {link.supplier.name}
          </Link>
          {link.roleNotes ? ` · ${link.roleNotes}` : ""}
        </p>
      ) : (
        <p className="text-sm text-white/50">{supplierName}</p>
      )}

      <LeonardoCollapsiblePanel
        title="Preventivi e fatture"
        summary={`${docCount} documenti · ${getSupplierCategoryLabel(link.categoryId)}`}
        defaultOpen
      >
        <LeonardoSupplierDocumentsSection
          title="Preventivi e fatture"
          description="Documenti specifici di questo evento."
          documents={link.documents ?? []}
          uploadUrl={`/api/lean-event/events/${eventId}/suppliers/${link.id}/documents`}
          allowedKinds={["preventivo", "fattura", "altro"]}
          defaultKind="preventivo"
          embedded
          hideTitle
          onUpdated={(documents) => onLinkChange({ ...link, documents })}
        />
      </LeonardoCollapsiblePanel>

      <LeonardoCollapsiblePanel
        title="Scambio email"
        summary={`${emailCount} comunicazioni registrate`}
        defaultOpen={emailCount > 0}
      >
        <LeonardoEventSupplierEmailsSection
          eventId={eventId}
          link={link}
          embedded
          onUpdated={(emails) => onLinkChange({ ...link, emails })}
        />
      </LeonardoCollapsiblePanel>

      {onRemove ? (
        <div className="border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={onRemove}
            className="rounded-full border border-red-500/40 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-red-200 transition hover:bg-red-500/10"
          >
            Rimuovi da evento
          </button>
        </div>
      ) : null}
    </div>
  );
}
