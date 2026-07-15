import type { EventAssignmentWithContact } from "@/lib/leanyou/event-assignments";
import {
  HOSPITALITY_STATUS_LABELS,
  isHospitalitySheetIncomplete,
  listHospitalityNightStays,
  normalizeAssignmentHospitality,
} from "@/lib/leanyou/hospitality";
import type { LeonardoEventHotelBlock } from "@/types/leanyou";

const EXPORT_HEADERS = [
  "Nome",
  "Cognome",
  "Email",
  "Ruolo",
  "Stato scheda",
  "Stato ospitalità",
  "Notti hotel",
  "Tratte viaggio",
  "Note evento",
] as const;

function escapeCsvCell(value: string): string {
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function assignmentToRow(
  assignment: EventAssignmentWithContact,
  hotelBlocks: LeonardoEventHotelBlock[]
): string[] {
  const hospitality = normalizeAssignmentHospitality(assignment.hospitality);
  const incomplete = isHospitalitySheetIncomplete(
    assignment.hospitality,
    hotelBlocks
  );
  const nightCount = listHospitalityNightStays(hospitality).length;

  return [
    assignment.contact.firstName,
    assignment.contact.lastName,
    assignment.contact.email,
    assignment.roleLabel,
    incomplete ? "Incompleta" : "Completa",
    HOSPITALITY_STATUS_LABELS[hospitality.status],
    String(nightCount),
    String(hospitality.travels.length),
    assignment.notes,
  ];
}

export function buildGuestsCsv(
  assignments: EventAssignmentWithContact[],
  hotelBlocks: LeonardoEventHotelBlock[]
): string {
  const lines = [
    EXPORT_HEADERS.join(";"),
    ...assignments.map((assignment) =>
      assignmentToRow(assignment, hotelBlocks)
        .map(escapeCsvCell)
        .join(";")
    ),
  ];
  return `\uFEFF${lines.join("\n")}`;
}

export function downloadGuestsCsv(
  assignments: EventAssignmentWithContact[],
  hotelBlocks: LeonardoEventHotelBlock[],
  filename = "leanyou-ospiti-evento.csv"
): void {
  const csv = buildGuestsCsv(assignments, hotelBlocks);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
