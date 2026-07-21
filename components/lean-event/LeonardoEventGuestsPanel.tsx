"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import eventsConfig from "@/data/lean-event/events-config.json";
import { LeonardoEventBulkAssign } from "@/components/lean-event/LeonardoEventBulkAssign";
import { LeonardoEventGuestListImport } from "@/components/lean-event/LeonardoEventGuestListImport";
import { LeonardoGuestListTable } from "@/components/lean-event/LeonardoGuestListTable";
import { LeonardoGuestSheetModal } from "@/components/lean-event/LeonardoGuestSheetModal";
import { useLeonardoWorkTabsOptional } from "@/components/lean-event/LeonardoWorkTabsContext";
import { LeonardoSubSectionNav } from "@/components/lean-event/LeonardoSubSectionNav";
import { LEONARDO_PANEL_TITLE } from "@/components/lean-event/leonardo-ui";
import { formatContactName } from "@/lib/lean-event/contact-display";
import { downloadGuestsCsv } from "@/lib/lean-event/guest-export";
import { LeonardoListSortSelect } from "@/components/lean-event/LeonardoListSortSelect";
import { sortByContactName, type ListSortMode } from "@/lib/lean-event/list-sort";
import { isHospitalitySheetIncomplete } from "@/lib/lean-event/hospitality";
import { buildGuestRemovalConfirmation } from "@/lib/lean-event/guest-removal";
import type { EventAssignmentWithContact } from "@/lib/lean-event/event-assignments";
import { SPEAKER_SUB_ROLES } from "@/lib/lean-event/event-nav";
import type {
  LeanEventContact,
  LeonardoAssignmentHospitality,
  LeonardoEvent,
  LeonardoEventHotelBlock,
  LeonardoEventRoleCategory,
  LeonardoRelatedEventParticipation,
  LeonardoVenue,
} from "@/types/lean-event";

type AssignmentRow = EventAssignmentWithContact;

const roleCategories = eventsConfig.roleCategories as Array<{
  id: LeonardoEventRoleCategory;
  label: string;
}>;

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;
type PageSizeValue = (typeof PAGE_SIZE_OPTIONS)[number] | "virtual";

type GuestContentFilter = "all" | "incomplete";
type GuestSection = "insert" | "list";
type GuestInsertMode = "single" | "bulk" | "file" | "paste";

interface LeonardoEventGuestsPanelProps {
  tenantSlug: string;
  eventId: string;
  hotelBlocks: LeonardoEventHotelBlock[];
  venues: LeonardoVenue[];
  relatedEvents: LeonardoEvent["relatedEvents"];
  initialAssignments: AssignmentRow[];
  contacts: LeanEventContact[];
  otherEvents: LeonardoEvent[];
  guestView?: GuestSection;
  initialGuestId?: string | null;
  /** Filtro ruolo bloccato dalla tab anagrafiche */
  lockedRoleFilter?: LeonardoEventRoleCategory | LeonardoEventRoleCategory[] | "";
  defaultRoleCategory?: LeonardoEventRoleCategory;
  panelTitle?: string;
  insertTabLabel?: string;
  listTabLabel?: string;
  onGuestViewChange?: (view: GuestSection) => void;
  onGuestSheetChange?: (assignmentId: string | null) => void;
  onAssignmentsChange?: (assignments: AssignmentRow[]) => void;
}

export function LeonardoEventGuestsPanel({
  tenantSlug,
  eventId,
  hotelBlocks,
  venues,
  relatedEvents = [],
  initialAssignments,
  contacts,
  otherEvents,
  guestView = "list",
  initialGuestId = null,
  lockedRoleFilter = "",
  defaultRoleCategory = "ospite",
  panelTitle = "Anagrafiche",
  insertTabLabel = "Inserisci",
  listTabLabel = "Visualizza elenco",
  onGuestViewChange,
  onGuestSheetChange,
  onAssignmentsChange,
}: LeonardoEventGuestsPanelProps) {
  const workTabs = useLeonardoWorkTabsOptional();
  const speakerRoles = Array.isArray(lockedRoleFilter)
    ? lockedRoleFilter
    : null;
  const lockedSingleRole =
    typeof lockedRoleFilter === "string" && lockedRoleFilter
      ? lockedRoleFilter
      : null;
  const roleSelectOptions = speakerRoles
    ? roleCategories.filter((role) => speakerRoles.includes(role.id))
    : lockedSingleRole
      ? roleCategories.filter((role) => role.id === lockedSingleRole)
      : roleCategories;
  const [assignments, setAssignments] = useState(initialAssignments);
  const [sheetAssignmentId, setSheetAssignmentId] = useState<string | null>(null);
  const [savingAssignmentId, setSavingAssignmentId] = useState<string | null>(
    null
  );
  const [sheetError, setSheetError] = useState<string | null>(null);

  function updateAssignments(next: AssignmentRow[]) {
    setAssignments(next);
    onAssignmentsChange?.(next);
  }

  useEffect(() => {
    setAssignments(initialAssignments);
  }, [initialAssignments]);
  const [contactId, setContactId] = useState("");
  const [roleCategory, setRoleCategory] =
    useState<LeonardoEventRoleCategory>(defaultRoleCategory);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<LeonardoEventRoleCategory | "">(
    typeof lockedRoleFilter === "string" ? lockedRoleFilter : ""
  );
  const [speakerSubFilter, setSpeakerSubFilter] = useState<
    LeonardoEventRoleCategory | ""
  >("");
  const [contentFilter, setContentFilter] = useState<GuestContentFilter>("all");
  const [sortMode, setSortMode] = useState<Exclude<ListSortMode, "date_start">>(
    "alphabetical"
  );
  const [insertMode, setInsertMode] = useState<GuestInsertMode>("single");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeValue>(DEFAULT_PAGE_SIZE);
  const [queueMode, setQueueMode] = useState(false);
  const [removingAssignmentId, setRemovingAssignmentId] = useState<string | null>(
    null
  );

  async function refreshAssignmentsFromServer(): Promise<AssignmentRow[] | null> {
    const response = await fetch(`/api/lean-event/events/${eventId}/assignments`, {
      credentials: "same-origin",
    });
    const payload = (await response.json()) as { assignments?: AssignmentRow[] };
    if (response.ok && Array.isArray(payload.assignments)) {
      updateAssignments(payload.assignments);
      return payload.assignments;
    }
    return null;
  }

  function openContactTab(contactId: string, contactName: string) {
    if (workTabs) {
      workTabs.openTab({
        kind: "contact",
        entityId: contactId,
        title: contactName,
      });
    }
  }

  function openGuestSheet(assignmentId: string) {
    const row = assignments.find((item) => item.id === assignmentId);
    if (workTabs) {
      workTabs.openTab({
        kind: "assignment",
        entityId: assignmentId,
        title: row?.contactName ?? "Scheda ospite",
        contextId: eventId,
      });
      // Non lasciare `?ospite=` in URL: al ritorno sulla tab evento riaprirebbe la scheda.
      onGuestSheetChange?.(null);
      return;
    }
    setSheetAssignmentId(assignmentId);
    onGuestSheetChange?.(assignmentId);
  }

  function closeGuestSheet() {
    setSheetAssignmentId(null);
    onGuestSheetChange?.(null);
  }

  const sortedContacts = useMemo(
    () =>
      [...contacts].sort((a, b) =>
        formatContactName(a).localeCompare(formatContactName(b), "it")
      ),
    [contacts]
  );

  useEffect(() => {
    if (typeof lockedRoleFilter === "string") {
      setRoleFilter(lockedRoleFilter);
      setSpeakerSubFilter("");
      if (lockedRoleFilter) {
        setRoleCategory(lockedRoleFilter);
      } else {
        setRoleCategory(defaultRoleCategory);
      }
    } else if (Array.isArray(lockedRoleFilter) && lockedRoleFilter.length > 0) {
      setRoleFilter("");
      setSpeakerSubFilter("");
      setRoleCategory(lockedRoleFilter[0]!);
    }
  }, [lockedRoleFilter, defaultRoleCategory]);

  const filteredAssignments = useMemo(() => {
    let rows = [...assignments];

    if (Array.isArray(lockedRoleFilter) && lockedRoleFilter.length > 0) {
      rows = rows.filter((assignment) =>
        lockedRoleFilter.includes(assignment.roleCategory)
      );
      if (speakerSubFilter) {
        rows = rows.filter(
          (assignment) => assignment.roleCategory === speakerSubFilter
        );
      }
    } else if (roleFilter) {
      rows = rows.filter((assignment) => assignment.roleCategory === roleFilter);
    }

    if (contentFilter === "incomplete") {
      rows = rows.filter((assignment) =>
        isHospitalitySheetIncomplete(assignment.hospitality, hotelBlocks)
      );
    }

    rows = sortByContactName(rows, sortMode);

    const normalized = query.trim().toLowerCase();
    if (normalized) {
      rows = rows.filter((assignment) => {
        const haystack = [
          assignment.contactName,
          assignment.roleLabel,
          assignment.contact.email,
          assignment.contact.organization,
          assignment.notes,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalized);
      });
    }

    return rows;
  }, [
    assignments,
    query,
    roleFilter,
    contentFilter,
    sortMode,
    hotelBlocks,
    lockedRoleFilter,
    speakerSubFilter,
  ]);

  const incompleteCount = useMemo(
    () =>
      assignments.filter((assignment) =>
        isHospitalitySheetIncomplete(assignment.hospitality, hotelBlocks)
      ).length,
    [assignments, hotelBlocks]
  );

  const totalPages = Math.max(
    1,
    pageSize === "virtual"
      ? 1
      : Math.ceil(filteredAssignments.length / pageSize)
  );
  const currentPage = Math.min(page, totalPages);
  const paginatedAssignments = useMemo(() => {
    if (pageSize === "virtual") {
      return filteredAssignments;
    }
    const start = (currentPage - 1) * pageSize;
    return filteredAssignments.slice(start, start + pageSize);
  }, [filteredAssignments, currentPage, pageSize]);

  const sheetAssignment = useMemo(
    () => assignments.find((item) => item.id === sheetAssignmentId) ?? null,
    [assignments, sheetAssignmentId]
  );

  const openedDeepLinkGuestRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialGuestId) {
      return;
    }
    if (openedDeepLinkGuestRef.current === initialGuestId) {
      return;
    }
    const exists = assignments.some((item) => item.id === initialGuestId);
    if (!exists) {
      return;
    }
    openedDeepLinkGuestRef.current = initialGuestId;
    openGuestSheet(initialGuestId);
    // Solo deep-link iniziale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGuestId, assignments]);

  useEffect(() => {
    setPage(1);
  }, [query, roleFilter, contentFilter, sortMode, pageSize]);

  async function handleAssign(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!contactId) {
      setError("Seleziona un contatto dalla rubrica.");
      return;
    }

    setPending(true);
    const response = await fetch(`/api/lean-event/events/${eventId}/assignments`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId, roleCategory, notes }),
    });
    const payload = (await response.json()) as {
      error?: string;
      assignment?: AssignmentRow;
    };
    setPending(false);

    if (!response.ok || !payload.assignment) {
      setError(payload.error ?? "Assegnazione non riuscita.");
      return;
    }

    await refreshAssignmentsFromServer();
    setContactId("");
    setNotes("");
    setRoleCategory("ospite");
  }

  async function handleRemove(assignmentId: string) {
    const row = assignments.find((item) => item.id === assignmentId);
    if (!row) {
      return;
    }
    if (!window.confirm(buildGuestRemovalConfirmation(row, assignments))) {
      return;
    }

    setError(null);
    setRemovingAssignmentId(assignmentId);
    const previousAssignments = assignments;
    updateAssignments(
      assignments.filter((item) => item.id !== assignmentId)
    );

    const response = await fetch(
      `/api/lean-event/events/${eventId}/assignments/${assignmentId}`,
      {
        method: "DELETE",
        credentials: "same-origin",
      }
    );
    setRemovingAssignmentId(null);

    if (!response.ok) {
      updateAssignments(previousAssignments);
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Rimozione non riuscita.");
      return;
    }
    if (sheetAssignmentId === assignmentId) {
      closeGuestSheet();
    }

    const refreshed = await refreshAssignmentsFromServer();
    if (!refreshed) {
      setError(
        "Ospite rimosso, ma l'elenco non si è aggiornato. Ricarica la pagina (F5)."
      );
      return;
    }
    if (refreshed.some((item) => item.id === assignmentId)) {
      updateAssignments(refreshed);
      setError(
        "L'ospite risulta ancora sull'evento. Ricarica la pagina e riprova."
      );
    }
  }

  async function saveAssignmentSheet(
    assignmentId: string,
    payload: {
      hospitality: LeonardoAssignmentHospitality;
      relatedParticipations: LeonardoRelatedEventParticipation[];
    }
  ) {
    setSavingAssignmentId(assignmentId);
    setSheetError(null);

    const assignment = assignments.find((item) => item.id === assignmentId);
    const response = await fetch(
      `/api/lean-event/events/${eventId}/assignments/${assignmentId}`,
      {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          expectedRevision: assignment?.revision ?? 1,
        }),
      }
    );

    const result = (await response.json()) as {
      error?: string;
      assignment?: AssignmentRow;
      updatedBy?: string;
      updatedAt?: string;
    };
    setSavingAssignmentId(null);

    if (response.status === 409 && result.error === "REVISION_CONFLICT") {
      setSheetError(
        `Conflitto: ${result.updatedBy ?? "un altro utente"} ha salvato prima di te. Ricarica la pagina.`
      );
      return;
    }
    if (!response.ok || !result.assignment) {
      setSheetError(result.error ?? "Salvataggio scheda non riuscito.");
      return;
    }

    const refreshed = await refreshAssignmentsFromServer();
    const list =
      refreshed ??
      assignments.map((item) =>
        item.id === assignmentId ? result.assignment! : item
      );
    if (!refreshed) {
      updateAssignments(list);
    }

    if (queueMode) {
      const incomplete = list.filter((item) =>
        isHospitalitySheetIncomplete(item.hospitality, hotelBlocks)
      );
      const currentIndex = incomplete.findIndex((item) => item.id === assignmentId);
      const next =
        incomplete[currentIndex + 1] ??
        incomplete.find((item) => item.id !== assignmentId) ??
        null;
      if (next) {
        openGuestSheet(next.id);
        return;
      }
    }

    closeGuestSheet();
  }

  function handleExportGuests() {
    const hasFilters =
      query.trim().length > 0 ||
      roleFilter.length > 0 ||
      contentFilter === "incomplete";
    downloadGuestsCsv(
      filteredAssignments,
      hotelBlocks,
      hasFilters ? "leanyou-ospiti-evento-filtrato.csv" : "leanyou-ospiti-evento.csv"
    );
  }

  return (
    <section className="min-w-0 space-y-6 overflow-hidden rounded-xl border border-white/10 bg-[#111111] p-6">
      <div>
        <h3 className={LEONARDO_PANEL_TITLE}>{panelTitle}</h3>
        <p className="mt-2 text-sm text-white/60">
          Elenco compatto con paginazione e scheda viaggio/ospitalità in popup,
          anche con migliaia di assegnazioni.
        </p>
      </div>

      <LeonardoSubSectionNav
        sections={[
          { id: "insert", label: insertTabLabel },
          { id: "list", label: listTabLabel },
        ]}
        active={guestView}
        onChange={(view) => onGuestViewChange?.(view)}
      />

      {guestView === "insert" ? (
        <>
          <LeonardoSubSectionNav
            sections={[
              { id: "single", label: "Singolo" },
              { id: "bulk", label: "Tag / azienda / evento" },
              { id: "file", label: "Excel / CSV" },
              { id: "paste", label: "Copia e incolla" },
            ]}
            active={insertMode}
            onChange={setInsertMode}
          />

          {insertMode === "single" ? (
      <form
        onSubmit={handleAssign}
        className="grid gap-3 rounded-xl border border-white/10 bg-black/40 p-4 md:grid-cols-2 xl:grid-cols-4"
      >
        <label className="block md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
            Contatto rubrica *
          </span>
          <select
            required
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
            className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
          >
            <option value="">Seleziona dalla rubrica</option>
            {sortedContacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {formatContactName(contact)}
                {contact.organization ? ` · ${contact.organization}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
            Ruolo su questo evento *
          </span>
          <select
            required
            value={roleCategory}
            onChange={(e) =>
              setRoleCategory(e.target.value as LeonardoEventRoleCategory)
            }
            disabled={Boolean(lockedSingleRole) && !speakerRoles}
            className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia disabled:opacity-70"
          >
            {roleSelectOptions.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
            Note evento
          </span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Opzionale"
            className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
          />
        </label>
        <div className="md:col-span-2 xl:col-span-4">
          <button
            type="submit"
            disabled={pending || contacts.length === 0}
            className="rounded-full bg-leanme-fuchsia px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark disabled:opacity-60"
          >
            {pending ? "Assegnazione..." : "Assegna all'evento"}
          </button>
        </div>
      </form>
          ) : null}

          {insertMode === "bulk" ? (
      <LeonardoEventBulkAssign
        embedded
        eventId={eventId}
        contacts={contacts}
        otherEvents={otherEvents}
        onAssigned={updateAssignments}
      />
          ) : null}

          {insertMode === "file" ? (
            <LeonardoEventGuestListImport
              eventId={eventId}
              contacts={contacts}
              mode="file"
              onAssigned={updateAssignments}
            />
          ) : null}

          {insertMode === "paste" ? (
            <LeonardoEventGuestListImport
              eventId={eventId}
              contacts={contacts}
              mode="paste"
              onAssigned={updateAssignments}
            />
          ) : null}

      {contacts.length === 0 ? (
        <p className="text-sm text-white/45">
          Nessun contatto in rubrica. Aggiungi anagrafiche da Rubrica contatti.
        </p>
      ) : null}

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </>
      ) : (
        <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="block md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
            Cerca assegnazioni
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome, ruolo, email..."
            className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
          />
        </label>
        {speakerRoles ? (
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
              Sotto-ruolo speaker
            </span>
            <select
              value={speakerSubFilter}
              onChange={(e) =>
                setSpeakerSubFilter(
                  e.target.value as LeonardoEventRoleCategory | ""
                )
              }
              className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
            >
              <option value="">Tutti gli speaker</option>
              {SPEAKER_SUB_ROLES.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
              {speakerRoles.includes("docente") ? (
                <option value="docente">Docente</option>
              ) : null}
            </select>
          </label>
        ) : !lockedSingleRole ? (
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
              Categoria ruolo
            </span>
            <select
              value={roleFilter}
              onChange={(e) =>
                setRoleFilter(e.target.value as LeonardoEventRoleCategory | "")
              }
              className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
            >
              <option value="">Tutte le categorie</option>
              {roleCategories.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
            Filtro schede
          </span>
          <select
            value={contentFilter}
            onChange={(e) =>
              setContentFilter(e.target.value as GuestContentFilter)
            }
            className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
          >
            <option value="all">Tutti ({assignments.length})</option>
            <option value="incomplete">
              Schede incomplete ({incompleteCount})
            </option>
          </select>
        </label>
        <LeonardoListSortSelect
          value={sortMode}
          onChange={(value) =>
            setSortMode(value as Exclude<ListSortMode, "date_start">)
          }
        />
      </div>

      {filteredAssignments.length === 0 ? (
        <p className="text-sm text-white/50">
          Nessun ospite assegnato a questo evento.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/45">
              Elenco ospiti · {filteredAssignments.length}
              {filteredAssignments.length !== assignments.length
                ? ` di ${assignments.length}`
                : ""}
              {incompleteCount > 0 ? ` · ${incompleteCount} da compilare` : ""}
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex items-center gap-2 text-xs text-white/60">
                <input
                  type="checkbox"
                  checked={queueMode}
                  onChange={(event) => {
                    setQueueMode(event.target.checked);
                    if (event.target.checked) {
                      setContentFilter("incomplete");
                    }
                  }}
                  className="accent-leanme-fuchsia"
                />
                Coda compilazione
              </label>
              <button
                type="button"
                onClick={handleExportGuests}
                className="rounded-full border border-white/20 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/70 transition hover:border-leanme-fuchsia hover:text-white"
              >
                Export Excel
              </button>
              <label className="block text-xs text-white/45">
                <span className="mb-1 block uppercase tracking-[0.1em]">
                  Righe per pagina
                </span>
                <select
                  value={pageSize}
                  onChange={(event) => {
                    const value = event.target.value;
                    setPageSize(
                      value === "virtual"
                        ? "virtual"
                        : (Number(value) as PageSizeValue)
                    );
                  }}
                  className="rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                  <option value="virtual">Scroll virtual ({filteredAssignments.length})</option>
                </select>
              </label>
            </div>
          </div>

          {sheetError ? (
            <p className="text-sm text-red-300">{sheetError}</p>
          ) : null}

          <LeonardoGuestListTable
            tenantSlug={tenantSlug}
            assignments={paginatedAssignments}
            hotelBlocks={hotelBlocks}
            activeSheetId={
              workTabs &&
              !workTabs.isListActive &&
              workTabs.activeId.startsWith("assignment:")
                ? workTabs.activeId.slice("assignment:".length)
                : sheetAssignmentId
            }
            onOpenContact={workTabs ? openContactTab : undefined}
            onOpenSheet={openGuestSheet}
            onRemove={handleRemove}
            removingAssignmentId={removingAssignmentId}
            virtualScroll={pageSize === "virtual"}
          />

          {pageSize !== "virtual" ? (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <p className="text-xs text-white/45">
              Pagina {currentPage} di {totalPages} · mostrando{" "}
              {paginatedAssignments.length} ospiti
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage(1)}
                className="rounded-full border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:border-leanme-fuchsia disabled:opacity-40"
              >
                Inizio
              </button>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:border-leanme-fuchsia disabled:opacity-40"
              >
                ← Precedente
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:border-leanme-fuchsia disabled:opacity-40"
              >
                Successiva →
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(totalPages)}
                className="rounded-full border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:border-leanme-fuchsia disabled:opacity-40"
              >
                Fine
              </button>
            </div>
          </div>
          ) : (
            <p className="pt-2 text-xs text-white/45">
              Scroll virtual attivo — {filteredAssignments.length} ospiti in elenco.
            </p>
          )}
        </div>
      )}

      {!workTabs && sheetAssignment ? (
        <LeonardoGuestSheetModal
          tenantSlug={tenantSlug}
          eventId={eventId}
          assignment={sheetAssignment}
          allAssignments={assignments}
          hotelBlocks={hotelBlocks}
          venues={venues}
          relatedEvents={relatedEvents ?? []}
          saving={
            savingAssignmentId === sheetAssignment.id ||
            removingAssignmentId === sheetAssignment.id
          }
          error={sheetError}
          onClose={() => {
            if (!savingAssignmentId) {
              closeGuestSheet();
              setSheetError(null);
            }
          }}
          onSave={(payload) => saveAssignmentSheet(sheetAssignment.id, payload)}
          onRemove={() => handleRemove(sheetAssignment.id)}
        />
      ) : null}
        </>
      )}
    </section>
  );
}
