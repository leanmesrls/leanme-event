"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import eventsConfig from "@/data/lean-event/events-config.json";
import { LeanAgentAiPoweredBy } from "@/components/lean-event/LeanAgentAiPoweredBy";
import { LeonardoEventAllotmentPanel } from "@/components/lean-event/LeonardoEventAllotmentPanel";
import { LeonardoEventRelatedEventsPanel } from "@/components/lean-event/LeonardoEventRelatedEventsPanel";
import { LeonardoEventSuppliersPanel } from "@/components/lean-event/LeonardoEventSuppliersPanel";
import { LeonardoEventChatPanel } from "@/components/lean-event/LeonardoEventChatPanel";
import { LeonardoEventGuestsPanel } from "@/components/lean-event/LeonardoEventGuestsPanel";
import { LeonardoEventPhaseNav } from "@/components/lean-event/LeonardoEventPhaseNav";
import { LeonardoEventProjectTeamFields } from "@/components/lean-event/LeonardoEventProjectTeamFields";
import { LeonardoEventPlaceholderPanel } from "@/components/lean-event/LeonardoEventPlaceholderPanel";
import {
  LeonardoEventReportPanel,
  type EventReportSubTab,
} from "@/components/lean-event/LeonardoEventReportPanel";
import {
  LeonardoEventTaxonomyFields,
  type EventTaxonomyFormState,
} from "@/components/lean-event/LeonardoEventTaxonomyFields";
import {
  LEONARDO_CANVAS_SURFACE,
} from "@/components/lean-event/leonardo-ui";
import { LeonardoRevisionConflictDialog } from "@/components/lean-event/LeonardoRevisionConflictDialog";
import { LeonardoRevisionStaleBanner } from "@/components/lean-event/LeonardoRevisionStaleBanner";
import { LeonardoEntityVersionsPanel } from "@/components/lean-event/LeonardoEntityVersionsPanel";
import { LeonardoVenuePicker } from "@/components/lean-event/LeonardoVenuePicker";
import { LeonardoDateInput } from "@/components/lean-event/LeonardoDateInput";
import { buildAllotmentReport } from "@/lib/lean-event/allotment-report";
import { formatEuropeanDate, isoDateToEuropeanDate, validateEventDateRange } from "@/lib/lean-event/dates";
import { normalizeHotelBlocks } from "@/lib/lean-event/event-hotel";
import { formatEventTaxonomySummary } from "@/lib/lean-event/event-taxonomy";
import { isHospitalitySheetIncomplete } from "@/lib/lean-event/hospitality";
import {
  leanEventLeonardoEventiPath,
  leanEventLeonardoNewPath,
  leanEventLeonardoWorkspacePath,
} from "@/lib/lean-event/paths";
import type { EventAssignmentWithContact } from "@/lib/lean-event/event-assignments";
import type { EventSupplierWithSupplier } from "@/lib/lean-event/event-suppliers";
import {
  EVENT_NAV_PHASES,
  EVENT_NAV_TABS,
  getDefaultTabForPhase,
  getPhaseForTab,
  isEventTabAccessible,
  normalizeEventTabQuery,
  type EventNavBadges,
  type EventPhaseId,
  type EventTabId,
} from "@/lib/lean-event/event-nav";
import type {
  LeanEventContact,
  LeanEventSupplier,
  LeanEventTenantUserPublic,
  LeonardoEvent,
  LeonardoVenue,
  LeonardoWorkspace,
} from "@/types/lean-event";
import { isRevisionConflictPayload } from "@/lib/lean-event/revision-conflict";
import { useEntityRevisionWatch } from "@/lib/lean-event/use-entity-revision-watch";

interface LeonardoEventDetailProps {
  tenantSlug: string;
  initialEvent: LeonardoEvent;
  venues: LeonardoVenue[];
  linkedWorkspaces: LeonardoWorkspace[];
  initialAssignments: EventAssignmentWithContact[];
  contacts: LeanEventContact[];
  initialSupplierLinks: EventSupplierWithSupplier[];
  rubricaSuppliers: LeanEventSupplier[];
  otherEvents: LeonardoEvent[];
  tenantUsers: LeanEventTenantUserPublic[];
  ospitiEnabled: boolean;
  hotelEnabled: boolean;
  logisticaEnabled: boolean;
  currentUserName: string;
  currentUserEmail: string;
  /** Quando true, back torna all'elenco tab invece di navigare. */
  embedded?: boolean;
  onBackToList?: () => void;
}

export function LeonardoEventDetail({
  tenantSlug,
  initialEvent,
  venues,
  linkedWorkspaces,
  initialAssignments,
  contacts,
  initialSupplierLinks,
  rubricaSuppliers,
  otherEvents,
  tenantUsers,
  ospitiEnabled,
  hotelEnabled,
  logisticaEnabled,
  currentUserName,
  currentUserEmail,
  embedded = false,
  onBackToList,
}: LeonardoEventDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = normalizeEventTabQuery(
    searchParams.get("tab"),
    searchParams.get("report")
  );

  const [event, setEvent] = useState(initialEvent);
  const [assignments, setAssignments] = useState(initialAssignments);
  const capabilities = {
    ospiti: ospitiEnabled,
    hotel: hotelEnabled,
    logistica: logisticaEnabled,
  };
  const [activePhase, setActivePhase] = useState<EventPhaseId>(
    getPhaseForTab(initialQuery.tab)
  );
  const [activeTab, setActiveTab] = useState<EventTabId>(initialQuery.tab);
  const [reportSubTab, setReportSubTab] = useState<EventReportSubTab>(
    initialQuery.reportSubTab ?? "viaggi"
  );
  const [guestView, setGuestView] = useState<"insert" | "list">(
    searchParams.get("vista") === "insert" ? "insert" : "list"
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{
    updatedBy?: string;
    updatedAt?: string;
  } | null>(null);
  const [stale, setStale] = useState<{
    updatedBy?: string;
    updatedAt?: string;
  } | null>(null);

  useEntityRevisionWatch({
    enabled: Boolean(event.id),
    fetchUrl: `/api/lean-event/events/${event.id}`,
    localRevision: event.revision ?? 1,
    extract: (payload) => {
      const next = (payload as { event?: LeonardoEvent }).event;
      if (!next) {
        return null;
      }
      return {
        revision: next.revision ?? 1,
        updatedAt: next.updatedAt,
        updatedBy: next.updatedBy,
      };
    },
    onRemoteNewer: (info) => {
      setStale({ updatedBy: info.updatedBy, updatedAt: info.updatedAt });
    },
  });

  async function reloadEventFromServer() {
    const response = await fetch(`/api/lean-event/events/${event.id}`, {
      credentials: "same-origin",
    });
    const payload = (await response.json()) as { event?: LeonardoEvent };
    if (payload.event) {
      setEvent(payload.event);
      setStale(null);
      setConflict(null);
    }
  }

  const activeTabDef =
    EVENT_NAV_TABS.find((tab) => tab.id === activeTab) ?? EVENT_NAV_TABS[0];
  const tabBlocked =
    activeTabDef.implemented &&
    activeTabDef.capability !== undefined &&
    !isEventTabAccessible(activeTabDef, capabilities);

  const navBadges = useMemo<EventNavBadges>(() => {
    const reportRows = buildAllotmentReport(
      { hotelBlocks: normalizeHotelBlocks(event), hotel: event.hotel },
      venues,
      assignments
    );
    return {
      ospiti: assignments.length,
      ospitiIncomplete: assignments.filter((assignment) =>
        isHospitalitySheetIncomplete(
          assignment.hospitality,
          normalizeHotelBlocks(event)
        )
      ).length,
      overbook: reportRows.filter((row) => row.overbooked).length,
    };
  }, [event, venues, assignments]);

  const phaseLabel =
    EVENT_NAV_PHASES.find((phase) => phase.id === activePhase)?.label ?? "";
  const tabLabel = activeTabDef.label;

  function syncUrl(next: {
    tab?: EventTabId;
    phase?: EventPhaseId;
    report?: EventReportSubTab;
    vista?: "insert" | "list";
    ospite?: string | null;
    fornitore?: string | null;
  }) {
    const params = new URLSearchParams();
    const tab = next.tab ?? activeTab;
    params.set("tab", tab);
    if (tab === "report") {
      params.set("report", next.report ?? reportSubTab);
    }
    if (tab === "ospiti") {
      params.set("vista", next.vista ?? guestView);
      const ospite =
        next.ospite !== undefined ? next.ospite : searchParams.get("ospite");
      if (ospite) {
        params.set("ospite", ospite);
      }
    }
    if (tab === "fornitori") {
      const fornitore =
        next.fornitore !== undefined ? next.fornitore : searchParams.get("fornitore");
      if (fornitore) {
        params.set("fornitore", fornitore);
      }
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handlePhaseChange(phase: EventPhaseId) {
    const tab = getDefaultTabForPhase(phase, capabilities);
    setActivePhase(phase);
    setActiveTab(tab);
    syncUrl({ tab, phase });
  }

  function handleTabChange(tab: EventTabId) {
    const tabDef = EVENT_NAV_TABS.find((item) => item.id === tab);
    if (tabDef) {
      setActivePhase(tabDef.phase);
    }
    setActiveTab(tab);
    syncUrl({ tab, phase: tabDef?.phase });
  }

  useEffect(() => {
    const query = normalizeEventTabQuery(
      searchParams.get("tab"),
      searchParams.get("report")
    );
    setActiveTab(query.tab);
    setActivePhase(getPhaseForTab(query.tab));
    if (query.reportSubTab) {
      setReportSubTab(query.reportSubTab);
    }
    setGuestView(searchParams.get("vista") === "insert" ? "insert" : "list");
  }, [searchParams]);

  const deepLinkGuestId =
    activeTab === "ospiti" ? searchParams.get("ospite") : null;
  const deepLinkSupplierLinkId =
    activeTab === "fornitori" ? searchParams.get("fornitore") : null;

  async function saveAnagrafica() {
    setSaving(true);
    setMessage(null);

    const validation = validateEventDateRange(event.startDate, event.endDate);
    if (!validation.ok) {
      setDateError(validation.message);
      setSaving(false);
      return;
    }
    setDateError(null);
    const response = await fetch(`/api/lean-event/events/${event.id}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        expectedRevision: event.revision ?? 1,
        cdc: event.cdc,
        title: event.title,
        venueId: event.venueId ?? null,
        venue: event.venue,
        startDate: event.startDate,
        endDate: event.endDate,
        categoryId: event.categoryId,
        healthAreaId: event.healthAreaId,
        ecmEnabled: event.ecmEnabled,
        ecmModality: event.ecmModality,
        status: event.status,
        notes: event.notes,
        projectLeaderUserId: event.projectLeaderUserId ?? null,
        projectManagerUserIds: event.projectManagerUserIds ?? [],
      }),
    });
    const payload = (await response.json()) as {
      error?: string;
      event?: LeonardoEvent;
      updatedBy?: string;
      updatedAt?: string;
    };
    setSaving(false);
    if (response.status === 409 && isRevisionConflictPayload(payload)) {
      setConflict({
        updatedBy: payload.updatedBy,
        updatedAt: payload.updatedAt,
      });
      return;
    }
    if (!response.ok || !payload.event) {
      setMessage(payload.error ?? "Salvataggio non riuscito.");
      return;
    }
    setEvent(payload.event);
    setMessage("Evento aggiornato.");
  }

  return (
    <div className="space-y-6">
      <LeonardoRevisionStaleBanner
        open={Boolean(stale)}
        updatedBy={stale?.updatedBy}
        updatedAt={stale?.updatedAt}
        onReload={() => {
          void reloadEventFromServer();
        }}
      />
      <div>
        {embedded && onBackToList ? (
          <button
            type="button"
            onClick={onBackToList}
            className="hidden text-xs font-semibold uppercase tracking-[0.1em] text-leanme-fuchsia lg:inline"
          >
            ← Torna all&apos;elenco
          </button>
        ) : (
          <Link
            href={leanEventLeonardoEventiPath(tenantSlug)}
            className="text-xs font-semibold uppercase tracking-[0.1em] text-leanme-fuchsia"
          >
            ← Torna agli eventi
          </Link>
        )}
        <h2
          className="mt-3 truncate text-2xl font-bold text-leanme-fuchsia sm:text-3xl"
          title={event.title}
        >
          {event.title}
        </h2>
        <p className="mt-2 text-sm text-white/60">
          CDC {event.cdc || "—"} · {formatEuropeanDate(event.startDate)}
          {event.endDate !== event.startDate
            ? ` → ${formatEuropeanDate(event.endDate)}`
            : ""}
        </p>
        <p className="mt-1 text-xs text-white/45">
          {formatEventTaxonomySummary(event)}
        </p>
        <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-white/35">
          {phaseLabel} › {tabLabel}
          {activeTab === "ospiti"
            ? ` › ${guestView === "insert" ? "Inserisci" : "Elenco"}`
            : ""}
          {activeTab === "report" ? ` › Report ${reportSubTab}` : ""}
        </p>
      </div>

      <LeonardoEventPhaseNav
        activePhase={activePhase}
        activeTab={activeTab}
        capabilities={capabilities}
        badges={navBadges}
        onPhaseChange={handlePhaseChange}
        onTabChange={handleTabChange}
      />

      <div data-leonardo-canvas className="leonardo-canvas space-y-6">
      {!activeTabDef.implemented ? (
        <LeonardoEventPlaceholderPanel tab={activeTabDef} />
      ) : null}

      {tabBlocked ? (
        <section className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-6">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-amber-100">
            {activeTabDef.label} non disponibile
          </h3>
          <p className="mt-3 text-sm text-white/70">
            Attiva il pack LeanEvent corrispondente per usare questa sezione
            nell&apos;evento.
          </p>
        </section>
      ) : null}

      {!tabBlocked && activeTabDef.implemented && activeTab === "evento" ? (
        <section className={`${LEONARDO_CANVAS_SURFACE} space-y-4`}>
          <LeonardoEventTaxonomyFields
            value={{
              categoryId: event.categoryId,
              healthAreaId: event.healthAreaId,
              ecmEnabled: event.ecmEnabled,
              ecmModality: event.ecmModality,
            }}
            onChange={(taxonomy: EventTaxonomyFormState) =>
              setEvent({
                ...event,
                ...taxonomy,
              })
            }
          />
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
              Titolo
            </span>
            <input
              value={event.title}
              onChange={(e) => setEvent({ ...event, title: e.target.value })}
              className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
              CDC
            </span>
            <input
              value={event.cdc}
              onChange={(e) => setEvent({ ...event, cdc: e.target.value })}
              className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
          <LeonardoVenuePicker
            tenantSlug={tenantSlug}
            venues={venues}
            venueId={event.venueId ?? null}
            venueText={event.venue}
            onChange={({ venueId, venue }) =>
              setEvent({ ...event, venueId, venue })
            }
          />
          <LeonardoEventProjectTeamFields
            tenantUsers={tenantUsers}
            projectLeaderUserId={event.projectLeaderUserId ?? null}
            projectManagerUserIds={event.projectManagerUserIds ?? []}
            onChange={({ projectLeaderUserId, projectManagerUserIds }) =>
              setEvent({
                ...event,
                projectLeaderUserId,
                projectManagerUserIds,
              })
            }
          />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
                Data inizio
              </span>
              <div className="mt-2">
                <LeonardoDateInput
                  value={isoDateToEuropeanDate(event.startDate) || event.startDate}
                  onChange={(startDate) => {
                    const endDate = event.endDate;
                    const validation = validateEventDateRange(startDate, endDate);
                    setDateError(validation.ok ? null : validation.message);
                    setEvent({ ...event, startDate });
                  }}
                  className="w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
                Data fine
              </span>
              <div className="mt-2">
                <LeonardoDateInput
                  value={isoDateToEuropeanDate(event.endDate) || event.endDate}
                  onChange={(endDate) => {
                    const validation = validateEventDateRange(event.startDate, endDate);
                    setDateError(validation.ok ? null : validation.message);
                    setEvent({ ...event, endDate });
                  }}
                  className="w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
                />
              </div>
            </label>
          </div>
          {dateError ? (
            <p className="text-sm text-red-300">{dateError}</p>
          ) : null}
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
              Stato
            </span>
            <select
              value={event.status}
              onChange={(e) =>
                setEvent({
                  ...event,
                  status: e.target.value as LeonardoEvent["status"],
                })
              }
              className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
            >
              {eventsConfig.eventStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
              Note
            </span>
            <textarea
              rows={4}
              value={event.notes}
              onChange={(e) => setEvent({ ...event, notes: e.target.value })}
              className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
          {message ? (
            <p className="text-sm text-leanme-fuchsia">{message}</p>
          ) : null}
          <button
            type="button"
            onClick={saveAnagrafica}
            disabled={saving || Boolean(dateError)}
            className="rounded-full bg-leanme-fuchsia px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark disabled:opacity-60"
          >
            {saving ? "Salvataggio..." : "Salva evento"}
          </button>
          <LeonardoEntityVersionsPanel
            entityType="event"
            entityId={event.id}
            currentRevision={event.revision}
            onRestored={(entity) => {
              setEvent(entity as LeonardoEvent);
              router.refresh();
            }}
          />
        </section>
      ) : null}

      {!tabBlocked && activeTabDef.implemented && activeTab === "ospiti" && ospitiEnabled ? (
        <LeonardoEventGuestsPanel
          tenantSlug={tenantSlug}
          eventId={event.id}
          hotelBlocks={normalizeHotelBlocks(event)}
          venues={venues}
          relatedEvents={event.relatedEvents}
          initialAssignments={assignments}
          contacts={contacts}
          otherEvents={otherEvents}
          guestView={guestView}
          initialGuestId={deepLinkGuestId}
          onGuestViewChange={(vista) => {
            setGuestView(vista);
            syncUrl({ vista, ospite: deepLinkGuestId });
          }}
          onGuestSheetChange={(ospite) => syncUrl({ ospite })}
          onAssignmentsChange={setAssignments}
        />
      ) : null}

      {!tabBlocked && activeTabDef.implemented && activeTab === "allotment" && hotelEnabled ? (
        <LeonardoEventAllotmentPanel
          tenantSlug={tenantSlug}
          event={event}
          venues={venues}
          assignments={assignments}
          onEventSaved={setEvent}
          onAssignmentsRefresh={async () => {
            const response = await fetch(
              `/api/lean-event/events/${event.id}/assignments`,
              { credentials: "same-origin" }
            );
            const payload = (await response.json()) as {
              assignments?: EventAssignmentWithContact[];
            };
            if (response.ok && payload.assignments) {
              setAssignments(payload.assignments);
            }
          }}
        />
      ) : null}

      {!tabBlocked && activeTabDef.implemented && activeTab === "eventi_correlati" ? (
        <LeonardoEventRelatedEventsPanel
          tenantSlug={tenantSlug}
          event={event}
          venues={venues}
          onEventSaved={setEvent}
        />
      ) : null}

      {!tabBlocked && activeTabDef.implemented && activeTab === "fornitori" ? (
        <LeonardoEventSuppliersPanel
          tenantSlug={tenantSlug}
          eventId={event.id}
          initialLinks={initialSupplierLinks}
          rubricaSuppliers={rubricaSuppliers}
          initialLinkId={deepLinkSupplierLinkId}
          onLinkSheetChange={(fornitore) => syncUrl({ fornitore })}
        />
      ) : null}

      {!tabBlocked && activeTabDef.implemented && activeTab === "report" ? (
        <LeonardoEventReportPanel
          tenantSlug={tenantSlug}
          event={event}
          venues={venues}
          assignments={assignments}
          hotelEnabled={hotelEnabled}
          logisticaEnabled={logisticaEnabled}
          initialSubTab={reportSubTab}
          onSubTabChange={(subTab) => {
            setReportSubTab(subTab);
            syncUrl({ report: subTab });
          }}
        />
      ) : null}

      {!tabBlocked && activeTabDef.implemented && activeTab === "chat" ? (
        <LeonardoEventChatPanel
          eventId={event.id}
          tenantSlug={tenantSlug}
          currentUserName={currentUserName}
          currentUserEmail={currentUserEmail}
        />
      ) : null}

      {!tabBlocked && activeTabDef.implemented && activeTab === "stampati" ? (
        <section className={`${LEONARDO_CANVAS_SURFACE} space-y-4`}>
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-leanme-fuchsia">
            Stampati
          </h3>
          <p className="mt-3 text-sm text-white/60">
            Upload stampati per categoria ({eventsConfig.graphicCategories.length}{" "}
            categorie predefinite). Con pack AI, generazione automatica da prompt.
          </p>
          <LeanAgentAiPoweredBy capability="stampati" className="mt-3" />
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {eventsConfig.graphicCategories.map((category) => (
              <li
                key={category.id}
                className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70"
              >
                {category.label}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!tabBlocked && activeTabDef.implemented && activeTab === "verbali" ? (
        <section className={`${LEONARDO_CANVAS_SURFACE} space-y-4`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-white/60">
              Verbali collegati a questo evento (`linkedEventId`).
            </p>
            <Link
              href={`${leanEventLeonardoNewPath(tenantSlug)}?eventId=${event.id}`}
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:border-leanme-fuchsia"
            >
              Nuovo verbale collegato
            </Link>
          </div>
          {linkedWorkspaces.length === 0 ? (
            <p className="mt-4 text-sm text-white/50">
              Nessun verbale collegato. Crea un workspace verbali e associa
              l&apos;evento dalla scheda workspace.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {linkedWorkspaces.map((workspace) => (
                <li key={workspace.id}>
                  <Link
                    href={leanEventLeonardoWorkspacePath(tenantSlug, workspace.id)}
                    className="block rounded-lg border border-white/10 px-4 py-3 transition hover:border-leanme-fuchsia/40"
                  >
                    <span className="font-medium">{workspace.title}</span>
                    <span className="ml-2 text-xs text-white/50">
                      {workspace.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
      </div>

      <LeonardoRevisionConflictDialog
        open={Boolean(conflict)}
        updatedBy={conflict?.updatedBy}
        updatedAt={conflict?.updatedAt}
        onReload={() => {
          void reloadEventFromServer();
        }}
        onDismiss={() => setConflict(null)}
      />
    </div>
  );
}
