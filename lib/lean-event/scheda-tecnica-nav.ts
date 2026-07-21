export type SchedaTecnicaSectionId = "info_generali" | "registrazione";

export interface SchedaTecnicaSection {
  id: SchedaTecnicaSectionId;
  label: string;
  description: string;
}

export const SCHEDA_TECNICA_SECTIONS: SchedaTecnicaSection[] = [
  {
    id: "info_generali",
    label: "Info generali",
    description: "Titolo, sede, date, tipologia, team e note di base.",
  },
  {
    id: "registrazione",
    label: "Registrazione",
    description:
      "Quote di iscrizione (tipologie, importi, finestre di validità) e regole rimborsi.",
  },
];

export function normalizeSchedaTecnicaSection(
  value: string | null | undefined
): SchedaTecnicaSectionId {
  return SCHEDA_TECNICA_SECTIONS.find((item) => item.id === value)?.id ??
    "info_generali";
}
