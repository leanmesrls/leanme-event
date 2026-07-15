"use client";

import { useState } from "react";

import { LeonardoEventHotelReportPanel } from "@/components/leanyou/LeonardoEventHotelReportPanel";
import { LeonardoEventLogisticsPanel } from "@/components/leanyou/LeonardoEventLogisticsPanel";
import { LeonardoEventPlaceholderPanel } from "@/components/leanyou/LeonardoEventPlaceholderPanel";
import { LeonardoEventTransferReportPanel } from "@/components/leanyou/LeonardoEventTransferReportPanel";
import { LeonardoSubSectionNav } from "@/components/leanyou/LeonardoSubSectionNav";
import type { EventAssignmentWithContact } from "@/lib/leanyou/event-assignments";
import type { LeonardoEvent, LeonardoVenue } from "@/types/leanyou";

export type EventReportSubTab = "viaggi" | "transfer" | "hotel" | "partecipanti";

interface LeonardoEventReportPanelProps {
  tenantSlug: string;
  event: LeonardoEvent;
  venues: LeonardoVenue[];
  assignments: EventAssignmentWithContact[];
  hotelEnabled: boolean;
  logisticaEnabled: boolean;
  initialSubTab?: EventReportSubTab;
  onSubTabChange?: (subTab: EventReportSubTab) => void;
}

export function LeonardoEventReportPanel({
  tenantSlug,
  event,
  venues,
  assignments,
  hotelEnabled,
  logisticaEnabled,
  initialSubTab = "viaggi",
  onSubTabChange,
}: LeonardoEventReportPanelProps) {
  const sections = [
    logisticaEnabled ? { id: "viaggi" as const, label: "Viaggi" } : null,
    logisticaEnabled ? { id: "transfer" as const, label: "Transfer" } : null,
    hotelEnabled ? { id: "hotel" as const, label: "Hotel" } : null,
    { id: "partecipanti" as const, label: "Partecipanti" },
  ].filter(Boolean) as Array<{ id: EventReportSubTab; label: string }>;

  const [subTab, setSubTab] = useState<EventReportSubTab>(
    sections.some((section) => section.id === initialSubTab)
      ? initialSubTab
      : sections[0]?.id ?? "partecipanti"
  );

  function changeSubTab(next: EventReportSubTab) {
    setSubTab(next);
    onSubTabChange?.(next);
  }

  return (
    <div className="space-y-4">
      <LeonardoSubSectionNav
        sections={sections}
        active={subTab}
        onChange={changeSubTab}
      />

      {subTab === "viaggi" && logisticaEnabled ? (
        <LeonardoEventLogisticsPanel
          tenantSlug={tenantSlug}
          event={event}
          venues={venues}
          assignments={assignments}
        />
      ) : null}

      {subTab === "transfer" && logisticaEnabled ? (
        <LeonardoEventTransferReportPanel event={event} assignments={assignments} />
      ) : null}

      {subTab === "hotel" && hotelEnabled ? (
        <LeonardoEventHotelReportPanel
          event={event}
          venues={venues}
          assignments={assignments}
        />
      ) : null}

      {subTab === "partecipanti" ? (
        <LeonardoEventPlaceholderPanel
          tab={{
            placeholderTitle: "Report partecipanti",
            placeholderDescription:
              "Elenco exportabile per categoria, presenze, badge e materiali personalizzati.",
          }}
        />
      ) : null}
    </div>
  );
}
