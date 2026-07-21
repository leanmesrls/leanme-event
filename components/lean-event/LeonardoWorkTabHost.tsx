"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { LeonardoContactSheetContent } from "@/components/lean-event/LeonardoContactSheetContent";
import { LeonardoEventDetail } from "@/components/lean-event/LeonardoEventDetail";
import { LeonardoGuestSheetModal } from "@/components/lean-event/LeonardoGuestSheetModal";
import { useLeonardoWorkTabs } from "@/components/lean-event/LeonardoWorkTabsContext";
import { LeonardoSupplierSheetContent } from "@/components/lean-event/LeonardoSupplierSheetContent";
import { LeonardoVenueSheetContent } from "@/components/lean-event/LeonardoVenueSheetContent";
import { formatContactName } from "@/lib/lean-event/contact-display";
import { buildGuestRemovalConfirmation } from "@/lib/lean-event/guest-removal";
import type { EventAssignmentWithContact } from "@/lib/lean-event/event-assignments";
import type { EventSupplierWithSupplier } from "@/lib/lean-event/event-suppliers";
import { resolveSectionListFromPath } from "@/lib/lean-event/work-tabs";
import type {
  LeanEventContact,
  LeanEventLeonardoCapabilities,
  LeanEventSupplier,
  LeanEventTenantUserPublic,
  LeonardoAssignmentHospitality,
  LeonardoEvent,
  LeonardoRelatedEventParticipation,
  LeonardoVenue,
  LeonardoWorkspace,
} from "@/types/lean-event";
import { cn } from "@/lib/utils";


function LoadingState({ label }: { label: string }) {
  return <p className="text-sm text-white/50">{label}</p>;
}

function ErrorState({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
      {message}
    </p>
  );
}

function MobileChrome({
  title,
  onBack,
  onClose,
  children,
}: {
  title: string;
  onBack: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    const mq = window.matchMedia("(max-width: 1023px)");
    function sync() {
      document.body.style.overflow = mq.matches ? "hidden" : previous;
    }
    sync();
    mq.addEventListener("change", sync);
    return () => {
      mq.removeEventListener("change", sync);
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black lg:static lg:z-auto lg:min-h-0">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2.5 lg:hidden">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-10 items-center rounded-md border border-white/20 px-3 text-xs font-semibold uppercase tracking-[0.08em] text-white/80"
        >
          ← Elenco
        </button>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
          {title}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi scheda"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/15 text-lg text-white/70"
        >
          ×
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-0 md:py-0 lg:overflow-visible">
        {children}
      </div>
    </div>
  );
}

function EventTabPanel({
  tenantSlug,
  eventId,
  title,
}: {
  tenantSlug: string;
  eventId: string;
  title: string;
}) {
  const { focusList, closeTab, renameTab } = useLeonardoWorkTabs();
  const [payload, setPayload] = useState<{
    event: LeonardoEvent;
    venues: LeonardoVenue[];
    linkedWorkspaces: LeonardoWorkspace[];
    assignments: EventAssignmentWithContact[];
    contacts: LeanEventContact[];
    supplierLinks: EventSupplierWithSupplier[];
    rubricaSuppliers: LeanEventSupplier[];
    otherEvents: LeonardoEvent[];
    tenantUsers: LeanEventTenantUserPublic[];
    ospitiEnabled: boolean;
    hotelEnabled: boolean;
    logisticaEnabled: boolean;
    moduleCapabilities: Partial<LeanEventLeonardoCapabilities>;
    currentUserName: string;
    currentUserEmail: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPayload(null);
    setError(null);
    void (async () => {
      const response = await fetch(
        `/api/lean-event/events/${eventId}/workspace`,
        { credentials: "same-origin" }
      );
      const data = (await response.json()) as {
        error?: string;
        event?: LeonardoEvent;
        venues?: LeonardoVenue[];
        linkedWorkspaces?: LeonardoWorkspace[];
        assignments?: EventAssignmentWithContact[];
        contacts?: LeanEventContact[];
        supplierLinks?: EventSupplierWithSupplier[];
        rubricaSuppliers?: LeanEventSupplier[];
        otherEvents?: LeonardoEvent[];
        tenantUsers?: LeanEventTenantUserPublic[];
        ospitiEnabled?: boolean;
        hotelEnabled?: boolean;
        logisticaEnabled?: boolean;
        moduleCapabilities?: Partial<LeanEventLeonardoCapabilities>;
        currentUserName?: string;
        currentUserEmail?: string;
      };
      if (cancelled) {
        return;
      }
      if (!response.ok || !data.event) {
        setError(data.error ?? "Caricamento evento non riuscito.");
        return;
      }
      if (data.event.title) {
        renameTab(`event:${eventId}`, data.event.title);
      }
      setPayload({
        event: data.event,
        venues: data.venues ?? [],
        linkedWorkspaces: data.linkedWorkspaces ?? [],
        assignments: data.assignments ?? [],
        contacts: data.contacts ?? [],
        supplierLinks: data.supplierLinks ?? [],
        rubricaSuppliers: data.rubricaSuppliers ?? [],
        otherEvents: data.otherEvents ?? [],
        tenantUsers: data.tenantUsers ?? [],
        ospitiEnabled: Boolean(data.ospitiEnabled),
        hotelEnabled: Boolean(data.hotelEnabled),
        logisticaEnabled: Boolean(data.logisticaEnabled),
        moduleCapabilities: data.moduleCapabilities ?? {},
        currentUserName: data.currentUserName ?? "",
        currentUserEmail: data.currentUserEmail ?? "",
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, renameTab]);

  return (
    <MobileChrome
      title={title}
      onBack={focusList}
      onClose={() => closeTab(`event:${eventId}`)}
    >
      {error ? <ErrorState message={error} /> : null}
      {!error && !payload ? <LoadingState label="Caricamento evento…" /> : null}
      {payload ? (
        <Suspense fallback={<LoadingState label="Caricamento evento…" />}>
          <LeonardoEventDetail
            tenantSlug={tenantSlug}
            initialEvent={payload.event}
            venues={payload.venues}
            linkedWorkspaces={payload.linkedWorkspaces}
            initialAssignments={payload.assignments}
            contacts={payload.contacts}
            initialSupplierLinks={payload.supplierLinks}
            rubricaSuppliers={payload.rubricaSuppliers}
            otherEvents={payload.otherEvents}
            tenantUsers={payload.tenantUsers}
            ospitiEnabled={payload.ospitiEnabled}
            hotelEnabled={payload.hotelEnabled}
            logisticaEnabled={payload.logisticaEnabled}
            moduleCapabilities={payload.moduleCapabilities}
            currentUserName={payload.currentUserName}
            currentUserEmail={payload.currentUserEmail}
            embedded
            onBackToList={focusList}
          />
        </Suspense>
      ) : null}
    </MobileChrome>
  );
}

function ContactTabPanel({
  tenantSlug,
  contactId,
  title,
}: {
  tenantSlug: string;
  contactId: string;
  title: string;
}) {
  const { focusList, closeTab, renameTab } = useLeonardoWorkTabs();
  const [contact, setContact] = useState<LeanEventContact | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setContact(null);
    setError(null);
    void (async () => {
      const response = await fetch(`/api/lean-event/contacts/${contactId}`, {
        credentials: "same-origin",
      });
      const data = (await response.json()) as {
        contact?: LeanEventContact;
        error?: string;
      };
      if (cancelled) {
        return;
      }
      if (!response.ok || !data.contact) {
        setError(data.error ?? "Caricamento contatto non riuscito.");
        return;
      }
      renameTab(`contact:${contactId}`, formatContactName(data.contact));
      setContact(data.contact);
    })();
    return () => {
      cancelled = true;
    };
  }, [contactId, renameTab]);

  return (
    <MobileChrome
      title={title}
      onBack={focusList}
      onClose={() => closeTab(`contact:${contactId}`)}
    >
      {error ? <ErrorState message={error} /> : null}
      {!error && !contact ? (
        <LoadingState label="Caricamento contatto…" />
      ) : null}
      {contact ? (
        <div className="leonardo-canvas rounded-xl border border-zinc-300/70 bg-[#f5f5f7] p-4 shadow-sm sm:p-5">
          <LeonardoContactSheetContent
            tenantSlug={tenantSlug}
            contact={contact}
            onContactChange={(next) => {
              setContact(next);
              renameTab(`contact:${contactId}`, formatContactName(next));
            }}
            onClose={focusList}
          />
        </div>
      ) : null}
    </MobileChrome>
  );
}

function VenueTabPanel({
  venueId,
  title,
}: {
  venueId: string;
  title: string;
}) {
  const { focusList, closeTab, renameTab } = useLeonardoWorkTabs();
  const [venue, setVenue] = useState<LeonardoVenue | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setVenue(null);
    setError(null);
    void (async () => {
      const response = await fetch(`/api/lean-event/venues/${venueId}`, {
        credentials: "same-origin",
      });
      const data = (await response.json()) as {
        venue?: LeonardoVenue;
        error?: string;
      };
      if (cancelled) {
        return;
      }
      if (!response.ok || !data.venue) {
        setError(data.error ?? "Caricamento sede non riuscito.");
        return;
      }
      renameTab(`venue:${venueId}`, data.venue.name);
      setVenue(data.venue);
    })();
    return () => {
      cancelled = true;
    };
  }, [venueId, renameTab]);

  return (
    <MobileChrome
      title={title}
      onBack={focusList}
      onClose={() => closeTab(`venue:${venueId}`)}
    >
      {error ? <ErrorState message={error} /> : null}
      {!error && !venue ? <LoadingState label="Caricamento sede…" /> : null}
      {venue ? (
        <div className="leonardo-canvas rounded-xl border border-zinc-300/70 bg-[#f5f5f7] p-4 shadow-sm sm:p-5">
          <LeonardoVenueSheetContent
            venue={venue}
            onVenueChange={(next) => {
              setVenue(next);
              renameTab(`venue:${venueId}`, next.name);
            }}
          />
        </div>
      ) : null}
    </MobileChrome>
  );
}

function SupplierTabPanel({
  supplierId,
  title,
}: {
  supplierId: string;
  title: string;
}) {
  const { focusList, closeTab, renameTab } = useLeonardoWorkTabs();
  const [supplier, setSupplier] = useState<LeanEventSupplier | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSupplier(null);
    setError(null);
    void (async () => {
      const response = await fetch(`/api/lean-event/suppliers/${supplierId}`, {
        credentials: "same-origin",
      });
      const data = (await response.json()) as {
        supplier?: LeanEventSupplier;
        error?: string;
      };
      if (cancelled) {
        return;
      }
      if (!response.ok || !data.supplier) {
        setError(data.error ?? "Caricamento fornitore non riuscito.");
        return;
      }
      renameTab(`supplier:${supplierId}`, data.supplier.name);
      setSupplier(data.supplier);
    })();
    return () => {
      cancelled = true;
    };
  }, [supplierId, renameTab]);

  return (
    <MobileChrome
      title={title}
      onBack={focusList}
      onClose={() => closeTab(`supplier:${supplierId}`)}
    >
      {error ? <ErrorState message={error} /> : null}
      {!error && !supplier ? (
        <LoadingState label="Caricamento fornitore…" />
      ) : null}
      {supplier ? (
        <div className="leonardo-canvas rounded-xl border border-zinc-300/70 bg-[#f5f5f7] p-4 shadow-sm sm:p-5">
          <LeonardoSupplierSheetContent
            supplier={supplier}
            onSupplierChange={(next) => {
              setSupplier(next);
              renameTab(`supplier:${supplierId}`, next.name);
            }}
          />
        </div>
      ) : null}
    </MobileChrome>
  );
}

function AssignmentTabPanel({
  tenantSlug,
  assignmentId,
  eventId,
  title,
}: {
  tenantSlug: string;
  assignmentId: string;
  eventId: string;
  title: string;
}) {
  const { focusList, closeTab, renameTab } = useLeonardoWorkTabs();
  const [event, setEvent] = useState<LeonardoEvent | null>(null);
  const [assignments, setAssignments] = useState<EventAssignmentWithContact[]>(
    []
  );
  const [venues, setVenues] = useState<LeonardoVenue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const assignment =
    assignments.find((item) => item.id === assignmentId) ?? null;

  useEffect(() => {
    let cancelled = false;
    setEvent(null);
    setAssignments([]);
    setVenues([]);
    setError(null);
    setSheetError(null);
    void (async () => {
      const response = await fetch(
        `/api/lean-event/events/${eventId}/workspace`,
        { credentials: "same-origin" }
      );
      const data = (await response.json()) as {
        error?: string;
        event?: LeonardoEvent;
        venues?: LeonardoVenue[];
        assignments?: EventAssignmentWithContact[];
      };
      if (cancelled) {
        return;
      }
      if (!response.ok || !data.event) {
        setError(data.error ?? "Caricamento scheda ospite non riuscito.");
        return;
      }
      const rows = data.assignments ?? [];
      const row = rows.find((item) => item.id === assignmentId);
      if (!row) {
        setError("Assegnazione non trovata su questo evento.");
        return;
      }
      renameTab(`assignment:${assignmentId}`, row.contactName);
      setEvent(data.event);
      setAssignments(rows);
      setVenues(data.venues ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [assignmentId, eventId, renameTab]);

  async function handleSave(payload: {
    hospitality: LeonardoAssignmentHospitality;
    relatedParticipations: LeonardoRelatedEventParticipation[];
  }) {
    if (!assignment) {
      return;
    }
    setSaving(true);
    setSheetError(null);
    const response = await fetch(
      `/api/lean-event/events/${eventId}/assignments/${assignmentId}`,
      {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          expectedRevision: assignment.revision ?? 1,
        }),
      }
    );
    const result = (await response.json()) as {
      error?: string;
      assignment?: EventAssignmentWithContact;
      updatedBy?: string;
    };
    setSaving(false);

    if (response.status === 409 && result.error === "REVISION_CONFLICT") {
      setSheetError(
        `Conflitto: ${result.updatedBy ?? "un altro utente"} ha salvato prima di te. Ricarica la scheda.`
      );
      return;
    }
    if (!response.ok || !result.assignment) {
      setSheetError(result.error ?? "Salvataggio scheda non riuscito.");
      return;
    }

    setAssignments((current) =>
      current.map((item) =>
        item.id === assignmentId ? result.assignment! : item
      )
    );
    renameTab(`assignment:${assignmentId}`, result.assignment.contactName);
    closeTab(`assignment:${assignmentId}`);
  }

  async function handleRemove() {
    if (!assignment) {
      return;
    }
    if (!window.confirm(buildGuestRemovalConfirmation(assignment, assignments))) {
      return;
    }
    setRemoving(true);
    setSheetError(null);
    const response = await fetch(
      `/api/lean-event/events/${eventId}/assignments/${assignmentId}`,
      {
        method: "DELETE",
        credentials: "same-origin",
      }
    );
    setRemoving(false);
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setSheetError(payload.error ?? "Rimozione non riuscita.");
      return;
    }
    closeTab(`assignment:${assignmentId}`);
  }

  return (
    <MobileChrome
      title={title}
      onBack={focusList}
      onClose={() => closeTab(`assignment:${assignmentId}`)}
    >
      {error ? <ErrorState message={error} /> : null}
      {!error && (!event || !assignment) ? (
        <LoadingState label="Caricamento scheda ospite…" />
      ) : null}
      {event && assignment ? (
        <LeonardoGuestSheetModal
          presentation="panel"
          tenantSlug={tenantSlug}
          eventId={eventId}
          assignment={assignment}
          allAssignments={assignments}
          hotelBlocks={event.hotelBlocks ?? []}
          venues={venues}
          relatedEvents={event.relatedEvents ?? []}
          saving={saving || removing}
          error={sheetError}
          onClose={() => closeTab(`assignment:${assignmentId}`)}
          onSave={handleSave}
          onRemove={handleRemove}
        />
      ) : null}
    </MobileChrome>
  );
}

export function LeonardoWorkTabHost({
  tenantSlug,
  children,
}: {
  tenantSlug: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { tabs, activeId, isListActive } = useLeonardoWorkTabs();
  const activeTab = tabs.find((tab) => tab.id === activeId) ?? null;
  const section = resolveSectionListFromPath(pathname, tenantSlug);

  /**
   * Keep-alive elenchi: ogni sezione visitata resta montata (nascosta).
   * Richiede Shell nel layout tenant (provider non rimontato).
   */
  const listCacheRef = useRef<Map<string, React.ReactNode>>(new Map());
  const [mountedSectionIds, setMountedSectionIds] = useState<string[]>([]);

  if (section && !listCacheRef.current.has(section.id)) {
    listCacheRef.current.set(section.id, children);
  }

  const sectionIds =
    section && !mountedSectionIds.includes(section.id)
      ? [...mountedSectionIds, section.id]
      : mountedSectionIds;

  useEffect(() => {
    if (!section) {
      return;
    }
    setMountedSectionIds((current) =>
      current.includes(section.id) ? current : [...current, section.id]
    );
  }, [section]);

  return (
    <div className="relative min-h-0 flex-1">
      {sectionIds.map((sectionId) => {
        const visible = isListActive && section?.id === sectionId;
        const node = listCacheRef.current.get(sectionId);
        if (!node) {
          return null;
        }
        return (
          <div
            key={sectionId}
            className={cn(!visible && "hidden")}
            aria-hidden={!visible}
          >
            {node}
          </div>
        );
      })}

      {!section ? (
        <div className={cn(!isListActive && "hidden")}>{children}</div>
      ) : null}

      {!isListActive && activeTab ? (
        <div className="min-h-0">
          {activeTab.kind === "event" ? (
            <EventTabPanel
              tenantSlug={tenantSlug}
              eventId={activeTab.entityId}
              title={activeTab.title}
            />
          ) : null}
          {activeTab.kind === "contact" ? (
            <ContactTabPanel
              tenantSlug={tenantSlug}
              contactId={activeTab.entityId}
              title={activeTab.title}
            />
          ) : null}
          {activeTab.kind === "venue" ? (
            <VenueTabPanel
              venueId={activeTab.entityId}
              title={activeTab.title}
            />
          ) : null}
          {activeTab.kind === "supplier" ? (
            <SupplierTabPanel
              supplierId={activeTab.entityId}
              title={activeTab.title}
            />
          ) : null}
          {activeTab.kind === "assignment" && activeTab.contextId ? (
            <AssignmentTabPanel
              tenantSlug={tenantSlug}
              assignmentId={activeTab.entityId}
              eventId={activeTab.contextId}
              title={activeTab.title}
            />
          ) : null}
          {activeTab.kind === "assignment" && !activeTab.contextId ? (
            <ErrorState message="Scheda ospite incompleta: riaprila dall’evento." />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
