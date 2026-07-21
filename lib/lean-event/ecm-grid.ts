import type {
  LeonardoEcmGrid,
  LeonardoEcmGridPerson,
  LeonardoEcmGridSponsor,
  LeonardoEcmProfessionTarget,
} from "@/types/lean-event";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ecm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function emptyPerson(): LeonardoEcmGridPerson {
  return {
    contactId: null,
    lastName: "",
    firstName: "",
    fiscalCode: "",
    phone: "",
    mobile: "",
    email: "",
    qualification: "",
  };
}

export function emptyEcmGridSponsor(): LeonardoEcmGridSponsor {
  return {
    id: newId(),
    eventSponsorId: null,
    company: "",
    amount: "",
    modality: "",
  };
}

export function emptyEcmGrid(): LeonardoEcmGrid {
  return {
    isCorporateTrainingProject: null,
    concernsInfantNutrition: null,
    effectiveDurationHours: null,
    effectiveDurationMinutes: null,
    formativeObjectiveCode: null,
    skillsTechnicalProfessional: "",
    skillsProcess: "",
    skillsSystem: "",
    workshopInsideCongress: null,
    interactiveResidentialTraining: null,
    interactiveDurationHours: null,
    professionTargets: [],
    scientificLeads: [emptyPerson()],
    scientificCommittee: [],
    facultyRelevance: null,
    teachingMethodIds: [],
    italianOnly: null,
    foreignLanguages: "",
    simultaneousTranslation: null,
    participationPaid: null,
    participationFee: "",
    expectedParticipants: null,
    onlineRegistration: null,
    directRecruitment: null,
    participantProvenance: null,
    presenceVerificationIds: [],
    learningVerificationId: null,
    durableMaterial: "",
    isSponsored: null,
    otherFunding: null,
    sponsors: [],
    otherFundingEntries: [],
    hasPartner: null,
    partners: [],
  };
}

function normalizePerson(
  person?: Partial<LeonardoEcmGridPerson> | null
): LeonardoEcmGridPerson {
  return {
    contactId: person?.contactId ?? null,
    lastName: person?.lastName?.trim() ?? "",
    firstName: person?.firstName?.trim() ?? "",
    fiscalCode: person?.fiscalCode?.trim().toUpperCase() ?? "",
    phone: person?.phone?.trim() ?? "",
    mobile: person?.mobile?.trim() ?? "",
    email: person?.email?.trim() ?? "",
    qualification: person?.qualification?.trim() ?? "",
  };
}

function normalizeTargets(
  targets?: LeonardoEcmProfessionTarget[] | null
): LeonardoEcmProfessionTarget[] {
  if (!Array.isArray(targets)) {
    return [];
  }
  return targets
    .map((item) => ({
      professionId: item.professionId?.trim() ?? "",
      disciplineId: item.disciplineId?.trim() ?? "",
      professionLabel: item.professionLabel?.trim() ?? "",
      disciplineLabel: item.disciplineLabel?.trim() ?? "",
    }))
    .filter((item) => item.professionId && item.disciplineId);
}

function normalizeSponsors(
  sponsors?: LeonardoEcmGridSponsor[] | null
): LeonardoEcmGridSponsor[] {
  if (!Array.isArray(sponsors)) {
    return [];
  }
  return sponsors.map((item) => ({
    id: item.id?.trim() || newId(),
    eventSponsorId: item.eventSponsorId ?? null,
    company: item.company?.trim() ?? "",
    amount: item.amount?.trim() ?? "",
    modality: item.modality?.trim() ?? "",
  }));
}

export function normalizeEcmGrid(
  grid?: Partial<LeonardoEcmGrid> | null
): LeonardoEcmGrid {
  const base = emptyEcmGrid();
  if (!grid) {
    return base;
  }
  const leads = Array.isArray(grid.scientificLeads)
    ? grid.scientificLeads.map(normalizePerson)
    : base.scientificLeads;
  const committee = Array.isArray(grid.scientificCommittee)
    ? grid.scientificCommittee.map(normalizePerson)
    : [];

  let partners = normalizeSponsors(grid.partners);
  if (partners.length === 0 && grid.partnerName?.trim()) {
    partners = [
      {
        ...emptyEcmGridSponsor(),
        company: grid.partnerName.trim(),
      },
    ];
  }

  const participationPaid =
    grid.participationPaid !== undefined && grid.participationPaid !== null
      ? grid.participationPaid
      : grid.participationFee?.trim()
        ? true
        : null;

  return {
    isCorporateTrainingProject:
      grid.isCorporateTrainingProject === undefined
        ? null
        : grid.isCorporateTrainingProject,
    concernsInfantNutrition:
      grid.concernsInfantNutrition === undefined
        ? null
        : grid.concernsInfantNutrition,
    effectiveDurationHours:
      typeof grid.effectiveDurationHours === "number"
        ? grid.effectiveDurationHours
        : null,
    effectiveDurationMinutes:
      typeof grid.effectiveDurationMinutes === "number"
        ? grid.effectiveDurationMinutes
        : null,
    formativeObjectiveCode:
      typeof grid.formativeObjectiveCode === "number"
        ? grid.formativeObjectiveCode
        : null,
    skillsTechnicalProfessional: grid.skillsTechnicalProfessional?.trim() ?? "",
    skillsProcess: grid.skillsProcess?.trim() ?? "",
    skillsSystem: grid.skillsSystem?.trim() ?? "",
    workshopInsideCongress:
      grid.workshopInsideCongress === undefined
        ? null
        : grid.workshopInsideCongress,
    interactiveResidentialTraining:
      grid.interactiveResidentialTraining === undefined
        ? null
        : grid.interactiveResidentialTraining,
    interactiveDurationHours:
      typeof grid.interactiveDurationHours === "number"
        ? grid.interactiveDurationHours
        : null,
    professionTargets: normalizeTargets(grid.professionTargets),
    scientificLeads: leads.length > 0 ? leads : [emptyPerson()],
    scientificCommittee: committee,
    facultyRelevance: grid.facultyRelevance ?? null,
    teachingMethodIds: Array.isArray(grid.teachingMethodIds)
      ? grid.teachingMethodIds.map((id) => String(id))
      : [],
    italianOnly: grid.italianOnly === undefined ? null : grid.italianOnly,
    foreignLanguages: grid.foreignLanguages?.trim() ?? "",
    simultaneousTranslation:
      grid.simultaneousTranslation === undefined
        ? null
        : grid.simultaneousTranslation,
    participationPaid,
    participationFee:
      participationPaid === false ? "" : grid.participationFee?.trim() ?? "",
    expectedParticipants:
      typeof grid.expectedParticipants === "number"
        ? grid.expectedParticipants
        : null,
    onlineRegistration:
      grid.onlineRegistration === undefined ? null : grid.onlineRegistration,
    directRecruitment: grid.directRecruitment ?? null,
    participantProvenance: grid.participantProvenance ?? null,
    presenceVerificationIds: Array.isArray(grid.presenceVerificationIds)
      ? grid.presenceVerificationIds.map((id) => String(id))
      : [],
    learningVerificationId: grid.learningVerificationId ?? null,
    durableMaterial: grid.durableMaterial?.trim() ?? "",
    isSponsored: grid.isSponsored === undefined ? null : grid.isSponsored,
    otherFunding: grid.otherFunding === undefined ? null : grid.otherFunding,
    sponsors: normalizeSponsors(grid.sponsors),
    otherFundingEntries: normalizeSponsors(grid.otherFundingEntries),
    hasPartner: grid.hasPartner === undefined ? null : grid.hasPartner,
    partners,
  };
}
