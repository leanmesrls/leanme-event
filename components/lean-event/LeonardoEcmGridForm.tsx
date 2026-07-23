"use client";

import { useMemo, useState } from "react";

import objectivesData from "@/data/lean-event/ecm-objectives.json";
import optionsData from "@/data/lean-event/ecm-grid-options.json";
import professionsData from "@/data/lean-event/ecm-professions.json";
import {
  emptyEcmGridSponsor,
  normalizeEcmGrid,
} from "@/lib/lean-event/ecm-grid";
import type {
  LeonardoEcmGrid,
  LeonardoEcmGridSponsor,
  LeonardoEcmProfessionTarget,
  TenantEventSponsorRecord,
} from "@/types/lean-event";

function YesNo({
  label,
  value,
  onChange,
  name,
}: {
  label: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
  name: string;
}) {
  return (
    <fieldset>
      <legend className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
        {label}
      </legend>
      <div className="mt-2 flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-white/80">
          <input
            type="radio"
            name={name}
            checked={value === true}
            onChange={() => onChange(true)}
            className="accent-leanme-fuchsia"
          />
          Sì
        </label>
        <label className="flex items-center gap-2 text-sm text-white/80">
          <input
            type="radio"
            name={name}
            checked={value === false}
            onChange={() => onChange(false)}
            className="accent-leanme-fuchsia"
          />
          No
        </label>
      </div>
    </fieldset>
  );
}

function FundingRows({
  title,
  rows,
  onChange,
  eventSponsors,
  allowPickFromRegistry,
}: {
  title: string;
  rows: LeonardoEcmGridSponsor[];
  onChange: (rows: LeonardoEcmGridSponsor[]) => void;
  eventSponsors: TenantEventSponsorRecord[];
  allowPickFromRegistry?: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/50">
        {title}
      </p>
      {rows.map((row, index) => (
        <div
          key={row.id}
          className="space-y-2 rounded-lg border border-white/10 bg-black/30 p-3"
        >
          {allowPickFromRegistry ? (
            <label className="block text-sm">
              <span className="mb-1 block text-white/60">
                Da gestione sponsor evento
              </span>
              <select
                value={row.eventSponsorId ?? ""}
                onChange={(e) => {
                  const next = [...rows];
                  const selected = eventSponsors.find(
                    (item) => item.id === e.target.value
                  );
                  next[index] = {
                    ...row,
                    eventSponsorId: e.target.value || null,
                    company: selected?.companyName || row.company,
                    amount: selected?.amount || row.amount,
                    modality: selected?.sponsorshipType || row.modality,
                  };
                  onChange(next);
                }}
                className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
              >
                <option value="">Inserimento manuale / scegli…</option>
                {eventSponsors.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.companyName || "Sponsor senza nome"}
                  </option>
                ))}
              </select>
              {eventSponsors.length === 0 ? (
                <span className="mt-1 block text-[11px] text-white/40">
                  Nessuno sponsor in Gestione sponsor (fase Sponsor). Puoi
                  compilare a mano.
                </span>
              ) : null}
            </label>
          ) : null}
          <div className="grid gap-2 md:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block text-white/60">Nome / azienda</span>
              <input
                value={row.company}
                onChange={(e) => {
                  const next = [...rows];
                  next[index] = { ...row, company: e.target.value };
                  onChange(next);
                }}
                className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-white/60">
                Tipo / modalità
              </span>
              <input
                value={row.modality}
                onChange={(e) => {
                  const next = [...rows];
                  next[index] = { ...row, modality: e.target.value };
                  onChange(next);
                }}
                className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-white/60">Importo</span>
              <input
                value={row.amount}
                onChange={(e) => {
                  const next = [...rows];
                  next[index] = { ...row, amount: e.target.value };
                  onChange(next);
                }}
                className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
            className="text-xs text-white/50 underline hover:text-white"
          >
            Rimuovi
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, emptyEcmGridSponsor()])}
        className="rounded-md border border-white/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70 hover:border-white hover:text-white"
      >
        Aggiungi
      </button>
    </div>
  );
}

interface LeonardoEcmGridFormProps {
  value: LeonardoEcmGrid;
  onChange: (value: LeonardoEcmGrid) => void;
  eventSponsors?: TenantEventSponsorRecord[];
}

export function LeonardoEcmGridForm({
  value,
  onChange,
  eventSponsors = [],
}: LeonardoEcmGridFormProps) {
  const grid = normalizeEcmGrid(value);
  const [objectiveGroupId, setObjectiveGroupId] = useState<string>(() => {
    if (!grid.formativeObjectiveCode) {
      return objectivesData.groups[0]?.id ?? "";
    }
    const found = objectivesData.groups.find((group) =>
      group.items.some((item) => item.code === grid.formativeObjectiveCode)
    );
    return found?.id ?? objectivesData.groups[0]?.id ?? "";
  });
  const [objectiveQuery, setObjectiveQuery] = useState("");

  const objectiveGroup = useMemo(
    () =>
      objectivesData.groups.find((group) => group.id === objectiveGroupId) ??
      objectivesData.groups[0],
    [objectiveGroupId]
  );

  const filteredObjectives = useMemo(() => {
    const items = objectiveGroup?.items ?? [];
    const q = objectiveQuery.trim().toLowerCase();
    if (!q) {
      return items;
    }
    return items.filter(
      (item) =>
        String(item.code).includes(q) || item.label.toLowerCase().includes(q)
    );
  }, [objectiveGroup, objectiveQuery]);

  function patch(partial: Partial<LeonardoEcmGrid>) {
    onChange(normalizeEcmGrid({ ...grid, ...partial }));
  }

  function toggleProfession(target: LeonardoEcmProfessionTarget) {
    const exists = grid.professionTargets.some(
      (item) => item.disciplineId === target.disciplineId
    );
    patch({
      professionTargets: exists
        ? grid.professionTargets.filter(
            (item) => item.disciplineId !== target.disciplineId
          )
        : [...grid.professionTargets, target],
    });
  }

  function toggleId(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
  }

  const selectedObjectiveLabel = useMemo(() => {
    if (!grid.formativeObjectiveCode) {
      return null;
    }
    for (const group of objectivesData.groups) {
      const item = group.items.find(
        (entry) => entry.code === grid.formativeObjectiveCode
      );
      if (item) {
        return `(${item.code}) ${item.label}`;
      }
    }
    return null;
  }, [grid.formativeObjectiveCode]);

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-xl border border-white/10 bg-black/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-leanme-fuchsia">
          Premesse
        </p>
        <YesNo
          name="pfa"
          label="Progetto Formativo Aziendale (PFA)"
          value={grid.isCorporateTrainingProject}
          onChange={(isCorporateTrainingProject) =>
            patch({ isCorporateTrainingProject })
          }
        />
        <YesNo
          name="infant"
          label="Argomenti inerenti l'alimentazione della prima infanzia"
          value={grid.concernsInfantNutrition}
          onChange={(concernsInfantNutrition) =>
            patch({ concernsInfantNutrition })
          }
        />
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">
              Durata effettiva — ore
            </span>
            <input
              type="number"
              min={0}
              value={grid.effectiveDurationHours ?? ""}
              onChange={(e) =>
                patch({
                  effectiveDurationHours:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">
              Durata effettiva — minuti
            </span>
            <input
              type="number"
              min={0}
              max={59}
              value={grid.effectiveDurationMinutes ?? ""}
              onChange={(e) =>
                patch({
                  effectiveDurationMinutes:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-white/10 bg-black/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-leanme-fuchsia">
          Obiettivi e competenze
        </p>
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
              Gruppo obiettivo
            </span>
            <select
              value={objectiveGroupId}
              onChange={(e) => {
                setObjectiveGroupId(e.target.value);
                setObjectiveQuery("");
              }}
              className="mt-2 w-full max-w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
            >
              {objectivesData.groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
              Cerca nell&apos;elenco
            </span>
            <input
              value={objectiveQuery}
              onChange={(e) => setObjectiveQuery(e.target.value)}
              placeholder="Codice o parole chiave…"
              className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
              Obiettivo formativo (uno solo)
            </span>
            <select
              value={grid.formativeObjectiveCode ?? ""}
              onChange={(e) =>
                patch({
                  formativeObjectiveCode:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
              size={8}
              className="mt-2 w-full max-w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm leading-snug outline-none focus:border-leanme-fuchsia [text-overflow:ellipsis]"
            >
              <option value="">Seleziona obiettivo</option>
              {filteredObjectives.map((item) => (
                <option key={item.code} value={item.code} title={item.label}>
                  ({item.code}) {item.label}
                </option>
              ))}
            </select>
          </label>
          {selectedObjectiveLabel ? (
            <p className="rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs leading-relaxed text-white/70">
              Selezionato: {selectedObjectiveLabel}
            </p>
          ) : null}
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-white/60">
            Acquisizione competenze tecnico-professionali
          </span>
          <textarea
            rows={3}
            value={grid.skillsTechnicalProfessional}
            onChange={(e) =>
              patch({ skillsTechnicalProfessional: e.target.value })
            }
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-white/60">
            Acquisizione competenze di processo
          </span>
          <textarea
            rows={3}
            value={grid.skillsProcess}
            onChange={(e) => patch({ skillsProcess: e.target.value })}
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-white/60">
            Acquisizione competenze di sistema
          </span>
          <textarea
            rows={3}
            value={grid.skillsSystem}
            onChange={(e) => patch({ skillsSystem: e.target.value })}
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
          />
        </label>
      </div>

      <div className="space-y-4 rounded-xl border border-white/10 bg-black/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-leanme-fuchsia">
          Formazione residenziale interattiva
        </p>
        <YesNo
          name="workshop"
          label="Workshop/seminari/corsi teorici (fino a 100) dentro congressi"
          value={grid.workshopInsideCongress}
          onChange={(workshopInsideCongress) =>
            patch({ workshopInsideCongress })
          }
        />
        <YesNo
          name="fri"
          label="Formazione residenziale interattiva"
          value={grid.interactiveResidentialTraining}
          onChange={(interactiveResidentialTraining) =>
            patch({ interactiveResidentialTraining })
          }
        />
        <label className="block text-sm">
          <span className="mb-1 block text-white/60">
            Ore attività formativa interattiva
          </span>
          <input
            type="number"
            min={0}
            step={0.5}
            value={grid.interactiveDurationHours ?? ""}
            onChange={(e) =>
              patch({
                interactiveDurationHours:
                  e.target.value === "" ? null : Number(e.target.value),
              })
            }
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
          />
        </label>
      </div>

      <div className="space-y-4 rounded-xl border border-white/10 bg-black/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-leanme-fuchsia">
          Professioni e discipline
        </p>
        <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border border-white/10 bg-black/40 p-3">
          {professionsData.professions.map((profession) => (
            <div key={profession.id}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/50">
                {profession.label}
              </p>
              <div className="mt-2 space-y-1">
                {profession.disciplines.map((discipline) => {
                  const checked = grid.professionTargets.some(
                    (item) => item.disciplineId === discipline.id
                  );
                  return (
                    <label
                      key={discipline.id}
                      className="flex items-start gap-2 text-sm text-white/75"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          toggleProfession({
                            professionId: profession.id,
                            disciplineId: discipline.id,
                            professionLabel: profession.label,
                            disciplineLabel: discipline.label,
                          })
                        }
                        className="mt-1 accent-leanme-fuchsia"
                      />
                      <span>{discipline.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-white/40">
          Selezionate: {grid.professionTargets.length}
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-white/10 bg-black/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-leanme-fuchsia">
          Didattica e lingua
        </p>
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
            Rilevanza docenti/relatori
          </legend>
          <div className="mt-2 flex flex-wrap gap-4">
            {optionsData.facultyRelevance.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-2 text-sm text-white/80"
              >
                <input
                  type="radio"
                  name="faculty-relevance"
                  checked={grid.facultyRelevance === item.id}
                  onChange={() =>
                    patch({
                      facultyRelevance:
                        item.id as LeonardoEcmGrid["facultyRelevance"],
                    })
                  }
                  className="accent-leanme-fuchsia"
                />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
            Metodo di insegnamento
          </legend>
          <div className="mt-2 space-y-2">
            {optionsData.teachingMethods.map((item) => (
              <label
                key={item.id}
                className="flex items-start gap-2 text-sm text-white/75"
              >
                <input
                  type="checkbox"
                  checked={grid.teachingMethodIds.includes(item.id)}
                  onChange={() =>
                    patch({
                      teachingMethodIds: toggleId(
                        grid.teachingMethodIds,
                        item.id
                      ),
                    })
                  }
                  className="mt-1 accent-leanme-fuchsia"
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <YesNo
          name="italian"
          label="Uso della sola lingua italiana"
          value={grid.italianOnly}
          onChange={(italianOnly) => patch({ italianOnly })}
        />
        {grid.italianOnly === false ? (
          <>
            <label className="block text-sm">
              <span className="mb-1 block text-white/60">
                Lingue straniere utilizzate
              </span>
              <input
                value={grid.foreignLanguages}
                onChange={(e) => patch({ foreignLanguages: e.target.value })}
                placeholder="Es. Inglese"
                className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
              />
            </label>
            <YesNo
              name="translation"
              label="Sistema di traduzione simultanea"
              value={grid.simultaneousTranslation}
              onChange={(simultaneousTranslation) =>
                patch({ simultaneousTranslation })
              }
            />
          </>
        ) : null}
      </div>

      <div className="space-y-4 rounded-xl border border-white/10 bg-black/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-leanme-fuchsia">
          Partecipanti e verifiche
        </p>
        <p className="text-xs text-white/40">
          Quote di iscrizione: vedi Setup → Scheda tecnica → Registrazione.
        </p>
        <label className="block text-sm">
          <span className="mb-1 block text-white/60">
            Numero partecipanti previsti
          </span>
          <input
            type="number"
            min={0}
            value={grid.expectedParticipants ?? ""}
            onChange={(e) =>
              patch({
                expectedParticipants:
                  e.target.value === "" ? null : Number(e.target.value),
              })
            }
            className="w-full max-w-xs rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
          />
        </label>
        <YesNo
          name="online-reg"
          label="Iscrizioni online"
          value={grid.onlineRegistration}
          onChange={(onlineRegistration) => patch({ onlineRegistration })}
        />
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
            Reclutamento diretto
          </span>
          <select
            value={grid.directRecruitment ?? ""}
            onChange={(e) =>
              patch({
                directRecruitment: (e.target.value ||
                  null) as LeonardoEcmGrid["directRecruitment"],
              })
            }
            className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
          >
            <option value="">Seleziona</option>
            {optionsData.directRecruitment.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
            Provenienza presumibile (una sola)
          </legend>
          <div className="mt-2 flex flex-wrap gap-4">
            {optionsData.participantProvenance.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-2 text-sm text-white/80"
              >
                <input
                  type="radio"
                  name="provenance"
                  checked={grid.participantProvenance === item.id}
                  onChange={() =>
                    patch({
                      participantProvenance:
                        item.id as LeonardoEcmGrid["participantProvenance"],
                    })
                  }
                  className="accent-leanme-fuchsia"
                />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
            Verifica presenza
          </legend>
          <div className="mt-2 space-y-2">
            {optionsData.presenceVerification.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-2 text-sm text-white/80"
              >
                <input
                  type="checkbox"
                  checked={grid.presenceVerificationIds.includes(item.id)}
                  onChange={() =>
                    patch({
                      presenceVerificationIds: toggleId(
                        grid.presenceVerificationIds,
                        item.id
                      ),
                    })
                  }
                  className="accent-leanme-fuchsia"
                />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
            Verifica apprendimento
          </span>
          <select
            value={grid.learningVerificationId ?? ""}
            onChange={(e) =>
              patch({ learningVerificationId: e.target.value || null })
            }
            className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
          >
            <option value="">Seleziona</option>
            {optionsData.learningVerification.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-white/60">
            Materiale durevole rilasciato (se previsto)
          </span>
          <textarea
            rows={2}
            value={grid.durableMaterial}
            onChange={(e) => patch({ durableMaterial: e.target.value })}
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
          />
        </label>
      </div>

      <div className="space-y-4 rounded-xl border border-white/10 bg-black/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-leanme-fuchsia">
          Sponsor, finanziamenti e partner
        </p>
        <YesNo
          name="sponsored"
          label="L'evento è sponsorizzato"
          value={grid.isSponsored}
          onChange={(isSponsored) =>
            patch({
              isSponsored,
              sponsors: isSponsored
                ? grid.sponsors.length > 0
                  ? grid.sponsors
                  : [emptyEcmGridSponsor()]
                : [],
            })
          }
        />
        {grid.isSponsored ? (
          <FundingRows
            title="Elenco sponsor"
            rows={grid.sponsors}
            onChange={(sponsors) => patch({ sponsors })}
            eventSponsors={eventSponsors}
            allowPickFromRegistry
          />
        ) : null}

        <YesNo
          name="other-funding"
          label="Sono presenti altre forme di finanziamento"
          value={grid.otherFunding}
          onChange={(otherFunding) =>
            patch({
              otherFunding,
              otherFundingEntries: otherFunding
                ? (grid.otherFundingEntries ?? []).length > 0
                  ? grid.otherFundingEntries
                  : [emptyEcmGridSponsor()]
                : [],
            })
          }
        />
        {grid.otherFunding ? (
          <FundingRows
            title="Altre forme di finanziamento"
            rows={grid.otherFundingEntries ?? []}
            onChange={(otherFundingEntries) => patch({ otherFundingEntries })}
            eventSponsors={eventSponsors}
          />
        ) : null}

        <YesNo
          name="partner"
          label="L'evento si avvale di partner"
          value={grid.hasPartner}
          onChange={(hasPartner) =>
            patch({
              hasPartner,
              partners: hasPartner
                ? (grid.partners ?? []).length > 0
                  ? grid.partners
                  : [emptyEcmGridSponsor()]
                : [],
            })
          }
        />
        {grid.hasPartner ? (
          <FundingRows
            title="Partner"
            rows={grid.partners ?? []}
            onChange={(partners) => patch({ partners })}
            eventSponsors={eventSponsors}
          />
        ) : null}
      </div>
    </div>
  );
}
