import { companionFromContact } from "@/lib/lean-event/companion";
import {
  createContact,
  findContactByEmailForTenant,
  getContact,
  saveContact,
} from "@/lib/lean-event/contacts";
import {
  createEventContactAssignment,
  listAssignmentsForEvent,
} from "@/lib/lean-event/event-assignments";
import {
  hasValidRoommate,
  normalizeAssignmentHospitality,
} from "@/lib/lean-event/hospitality";
import type {
  LeanEventSession,
  LeonardoAssignmentHospitality,
} from "@/types/lean-event";

export class RoommateParticipantEmailRequiredError extends Error {
  constructor() {
    super("ROOMMATE_PARTICIPANT_EMAIL_REQUIRED");
    this.name = "RoommateParticipantEmailRequiredError";
  }
}

export async function ensureRoommateParticipantOnEvent(
  session: LeanEventSession,
  eventId: string,
  hospitalityInput: LeonardoAssignmentHospitality
): Promise<LeonardoAssignmentHospitality> {
  const hospitality = normalizeAssignmentHospitality(hospitalityInput);

  if (hospitality.roommateRole !== "participant" || !hasValidRoommate(hospitality)) {
    return hospitality;
  }

  let contactId = hospitality.roommateContactId;
  let contact = contactId
    ? await getContact(session.tenantId, contactId)
    : null;

  if (!contact) {
    const email = hospitality.roommateEmail.trim();
    if (!email) {
      throw new RoommateParticipantEmailRequiredError();
    }

    const firstName = hospitality.roommateFirstName.trim();
    const lastName = hospitality.roommateLastName.trim();
    if (!firstName || !lastName) {
      throw new Error("ROOMMATE_PARTICIPANT_NAME_REQUIRED");
    }

    contact = await findContactByEmailForTenant(session.tenantId, email);
    if (!contact) {
      const draft = createContact(session, {
        firstName,
        lastName,
        email,
        phones: hospitality.roommatePhone.trim()
          ? [{ label: "Principale", number: hospitality.roommatePhone.trim() }]
          : [],
        organization: "",
        tags: [],
        notes: "",
      });
      await saveContact(draft);
      contact = draft;
    }
    contactId = contact.id;
  }

  const assignments = await listAssignmentsForEvent(session.tenantId, eventId);
  const alreadyAssigned = assignments.some(
    (assignment) => assignment.contactId === contactId
  );

  if (!alreadyAssigned) {
    await createEventContactAssignment(session, {
      eventId,
      contactId: contactId!,
      roleCategory: "ospite",
      notes: "Aggiunto come partecipante (compagno di camera).",
    });
  }

  const person = companionFromContact(contact);
  return normalizeAssignmentHospitality({
    ...hospitality,
    roommateContactId: contactId,
    roommateFirstName: person.firstName,
    roommateLastName: person.lastName,
    roommatePhone: person.phone,
    roommateEmail: person.email,
    roommateName: `${person.firstName} ${person.lastName}`.trim(),
    roommateRole: "participant",
  });
}
