"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { formatEuropeanDate } from "@/lib/lean-event/dates";
import {
  LEAN_EVENT_CONTACT_EVENTS_UI_PAGE_SIZE,
} from "@/lib/lean-event/entity-lifecycle";
import type { ContactAssignmentWithEvent } from "@/lib/lean-event/event-assignments";
import { leanEventLeonardoEventPath } from "@/lib/lean-event/paths";

interface LeonardoContactLinkedEventsProps {
  tenantSlug: string;
  assignments: ContactAssignmentWithEvent[];
  loading?: boolean;
  /** Link opzionale sotto la lista (es. scheda completa). */
  footer?: ReactNode;
}

function AssignmentRow({
  tenantSlug,
  assignment,
}: {
  tenantSlug: string;
  assignment: ContactAssignmentWithEvent;
}) {
  const dateLabel = assignment.eventStartDate
    ? formatEuropeanDate(assignment.eventStartDate)
    : null;

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm">
      <Link
        href={leanEventLeonardoEventPath(tenantSlug, assignment.eventId)}
        className="font-medium text-leanme-fuchsia hover:underline"
      >
        {assignment.eventTitle}
      </Link>
      <p className="text-xs text-white/50">
        {assignment.roleLabel}
        {dateLabel ? ` · ${dateLabel}` : ""}
        {!assignment.eventIsCurrent ? " · concluso" : ""}
      </p>
    </div>
  );
}

/** Lista eventi collegati sostenibileibile: attuali prima, poi passati, con “mostra altri”. */
export function LeonardoContactLinkedEvents({
  tenantSlug,
  assignments,
  loading = false,
  footer,
}: LeonardoContactLinkedEventsProps) {
  const [showAll, setShowAll] = useState(false);

  const { current, past } = useMemo(() => {
    const currentRows: ContactAssignmentWithEvent[] = [];
    const pastRows: ContactAssignmentWithEvent[] = [];
    for (const row of assignments) {
      if (row.eventIsCurrent) {
        currentRows.push(row);
      } else {
        pastRows.push(row);
      }
    }
    return { current: currentRows, past: pastRows };
  }, [assignments]);

  const visibleLimit = showAll
    ? assignments.length
    : LEAN_EVENT_CONTACT_EVENTS_UI_PAGE_SIZE;

  const visibleCurrent = current.slice(0, visibleLimit);
  const remainingSlots = Math.max(0, visibleLimit - visibleCurrent.length);
  const visiblePast = past.slice(0, remainingSlots);
  const hiddenCount = Math.max(0, assignments.length - visibleLimit);

  if (loading) {
    return <p className="text-sm text-white/50">Caricamento eventi…</p>;
  }

  if (assignments.length === 0) {
    return (
      <p className="text-sm text-white/50">
        Nessun ruolo su eventi. Collega il contatto dal tab Ospiti.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {visibleCurrent.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">
            In corso / futuri ({current.length})
          </p>
          {visibleCurrent.map((assignment) => (
            <AssignmentRow
              key={assignment.id}
              tenantSlug={tenantSlug}
              assignment={assignment}
            />
          ))}
        </div>
      ) : null}

      {visiblePast.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">
            Passati ({past.length})
          </p>
          {visiblePast.map((assignment) => (
            <AssignmentRow
              key={assignment.id}
              tenantSlug={tenantSlug}
              assignment={assignment}
            />
          ))}
        </div>
      ) : null}

      {hiddenCount > 0 && !showAll ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-xs font-semibold uppercase tracking-[0.08em] text-leanme-fuchsia hover:underline"
        >
          Mostra altri {hiddenCount} eventi
        </button>
      ) : null}

      {showAll && assignments.length > LEAN_EVENT_CONTACT_EVENTS_UI_PAGE_SIZE ? (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="text-xs text-white/40 hover:text-leanme-fuchsia"
        >
          Mostra meno
        </button>
      ) : null}

      {footer}
    </div>
  );
}
