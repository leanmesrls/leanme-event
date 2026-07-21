"use client";

import {
  emptyScientificSession,
  formatDurationMinutes,
  normalizeScientificProgram,
  scientificProgramTrainingMinutes,
} from "@/lib/lean-event/scientific-program";
import type { LeonardoScientificProgram } from "@/types/lean-event";

interface LeonardoScientificProgramFormProps {
  value: LeonardoScientificProgram | null | undefined;
  accreditedMinutes?: number | null;
  onChange: (value: LeonardoScientificProgram) => void;
}

export function LeonardoScientificProgramForm({
  value,
  accreditedMinutes = null,
  onChange,
}: LeonardoScientificProgramFormProps) {
  const program = normalizeScientificProgram(value);
  const trainingMinutes = scientificProgramTrainingMinutes(program);
  const mismatch =
    accreditedMinutes !== null &&
    accreditedMinutes !== undefined &&
    accreditedMinutes > 0 &&
    trainingMinutes > 0 &&
    Math.abs(accreditedMinutes - trainingMinutes) > 1;

  function patchSession(
    index: number,
    partial: Partial<(typeof program.sessions)[number]>
  ) {
    const sessions = [...program.sessions];
    sessions[index] = { ...sessions[index]!, ...partial };
    onChange({ sessions });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/70">
        <p>
          Ore nette del programma (solo sessioni, pause escluse):{" "}
          <span className="font-semibold text-white">
            {formatDurationMinutes(trainingMinutes)}
          </span>
        </p>
        {accreditedMinutes !== null && accreditedMinutes !== undefined ? (
          <p className="mt-1 text-xs text-white/45">
            Durata griglia / accreditamento:{" "}
            {formatDurationMinutes(accreditedMinutes)}
          </p>
        ) : null}
        {mismatch ? (
          <p className="mt-2 text-xs text-amber-200">
            Attenzione: la somma delle sessioni non corrisponde alla durata
            effettiva indicata in griglia. Allinea programma e dati
            accreditamento.
          </p>
        ) : null}
      </div>

      {program.sessions.length === 0 ? (
        <p className="text-sm text-white/50">
          Nessuna sessione. Aggiungi una relazione o una pausa.
        </p>
      ) : null}

      {program.sessions.map((session, index) => (
        <div
          key={session.id}
          className="space-y-3 rounded-xl border border-white/10 bg-black/40 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <select
              value={session.kind}
              onChange={(e) =>
                patchSession(index, {
                  kind: e.target.value as "session" | "break",
                  title:
                    e.target.value === "break" && !session.title
                      ? "Pausa"
                      : session.title,
                })
              }
              className="rounded-lg border border-white/15 bg-black px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] outline-none focus:border-leanme-fuchsia"
            >
              <option value="session">Sessione / relazione</option>
              <option value="break">Pausa</option>
            </select>
            <button
              type="button"
              onClick={() =>
                onChange({
                  sessions: program.sessions.filter((_, i) => i !== index),
                })
              }
              className="text-xs text-white/50 underline hover:text-white"
            >
              Rimuovi
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block text-white/60">Giorno</span>
              <input
                value={session.dayDate ?? ""}
                onChange={(e) => patchSession(index, { dayDate: e.target.value })}
                placeholder="gg/mm/aaaa"
                className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-white/60">Ora inizio</span>
              <input
                value={session.startTime}
                onChange={(e) =>
                  patchSession(index, { startTime: e.target.value })
                }
                placeholder="09:00"
                className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-white/60">Ora fine</span>
              <input
                value={session.endTime}
                onChange={(e) => patchSession(index, { endTime: e.target.value })}
                placeholder="10:30"
                className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-white/60">
              {session.kind === "break" ? "Titolo pausa" : "Titolo relazione / sessione"}
            </span>
            <input
              value={session.title}
              onChange={(e) => patchSession(index, { title: e.target.value })}
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>

          {session.kind === "session" ? (
            <>
              <label className="block text-sm">
                <span className="mb-1 block text-white/60">
                  Moderatore/i (più nomi separati da virgola)
                </span>
                <input
                  value={session.moderators}
                  onChange={(e) =>
                    patchSession(index, { moderators: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-white/60">
                  Speaker (più nomi separati da virgola)
                </span>
                <input
                  value={session.speakers}
                  onChange={(e) =>
                    patchSession(index, { speakers: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-white/60">
                  Altri speaker / ruoli
                </span>
                <input
                  value={session.otherSpeakers}
                  onChange={(e) =>
                    patchSession(index, { otherSpeakers: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
                />
              </label>
            </>
          ) : null}
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            onChange({
              sessions: [...program.sessions, emptyScientificSession("session")],
            })
          }
          className="rounded-md border border-white/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70 hover:border-white hover:text-white"
        >
          Aggiungi sessione
        </button>
        <button
          type="button"
          onClick={() =>
            onChange({
              sessions: [...program.sessions, emptyScientificSession("break")],
            })
          }
          className="rounded-md border border-white/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70 hover:border-white hover:text-white"
        >
          Aggiungi pausa
        </button>
      </div>
      <p className="text-[11px] text-white/40">
        Prossimo step: collegare moderatori/speaker alla faculty dalla rubrica.
      </p>
    </div>
  );
}
