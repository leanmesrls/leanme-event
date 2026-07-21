export type FormationEcmSectionId =
  | "griglia"
  | "faculty"
  | "accreditamento"
  | "badge"
  | "post_evento";

export interface FormationEcmSection {
  id: FormationEcmSectionId;
  label: string;
  implemented: boolean;
  description: string;
}

export const FORMATION_ECM_SECTIONS: FormationEcmSection[] = [
  {
    id: "griglia",
    label: "Griglia tecnica",
    implemented: true,
    description:
      "Dati per la griglia di accreditamento (RES e, a seguire, altre modalità).",
  },
  {
    id: "faculty",
    label: "Faculty / Speaker",
    implemented: true,
    description:
      "Responsabile scientifico, comitato scientifico e faculty dalla rubrica.",
  },
  {
    id: "accreditamento",
    label: "Dati di accreditamento",
    implemented: false,
    description:
      "Codice ECM progetto, ore/minuti AGENAS, crediti, allineamento al programma.",
  },
  {
    id: "badge",
    label: "Badge e presenze",
    implemented: false,
    description:
      "QR/badge, ingressi/uscite multipli, calcolo presenza ≥ 90% sulle ore nette.",
  },
  {
    id: "post_evento",
    label: "Attività post evento",
    implemented: false,
    description:
      "Correzione orari, questionario online ECM, soglia 75%, attestati e crediti faculty.",
  },
];

export function normalizeFormationEcmSection(
  value: string | null | undefined
): FormationEcmSectionId {
  if (value === "programma") {
    return "griglia";
  }
  const match = FORMATION_ECM_SECTIONS.find((section) => section.id === value);
  return match?.id ?? "griglia";
}
