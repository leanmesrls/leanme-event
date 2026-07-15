import { formatCompanionName } from "@/lib/lean-event/companion";
import type { EventAssignmentWithContact } from "@/lib/lean-event/event-assignments";
import {
  formatRoommateSummary,
  hasValidRoommate,
  normalizeAssignmentHospitality,
} from "@/lib/lean-event/hospitality";

export function buildGuestRemovalConfirmation(
  assignment: EventAssignmentWithContact,
  allAssignments: EventAssignmentWithContact[]
): string {
  const lines = [
    `Rimuovere ${assignment.contactName} (${assignment.roleLabel}) da questo evento?`,
    "",
    "• L'assegnazione va nel cestino (recuperabile 30 giorni)",
    "• Allotment, report ed eventi correlati si aggiornano subito",
    "• Il contatto resta in rubrica",
  ];

  const hospitality = normalizeAssignmentHospitality(assignment.hospitality);
  if (!hasValidRoommate(hospitality)) {
    return lines.join("\n");
  }

  const roommateLabel =
    formatRoommateSummary(hospitality) ||
    formatCompanionName({
      firstName: hospitality.roommateFirstName,
      lastName: hospitality.roommateLastName,
    }) ||
    "Compagno di camera";

  if (hospitality.roommateRole === "participant") {
    const roommateAssignment = hospitality.roommateContactId
      ? allAssignments.find(
          (item) =>
            item.contactId === hospitality.roommateContactId &&
            item.id !== assignment.id
        )
      : null;

    lines.push("");
    if (roommateAssignment) {
      lines.push(
        `Attenzione: ${roommateLabel} è anche nell'elenco ospiti e RESTERÀ sull'evento.`,
        "Per toglierlo/a devi rimuoverlo/a separatamente."
      );
    } else {
      lines.push(
        `Attenzione: ${roommateLabel} è indicato/a come partecipante ma non risulta in elenco ospiti.`,
        "I suoi dati in scheda andranno persi con questa rimozione."
      );
    }
  } else {
    lines.push("");
    lines.push(
      `Verranno eliminati anche i dati del compagno di camera ${roommateLabel} (solo scheda hotel, non è ospite dell'evento).`
    );
  }

  return lines.join("\n");
}
