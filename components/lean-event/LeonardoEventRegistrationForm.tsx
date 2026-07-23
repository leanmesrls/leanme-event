"use client";

import {
  emptyRegistrationFee,
  normalizeEventRegistration,
} from "@/lib/lean-event/event-registration";
import type { TenantEventRegistration } from "@/types/lean-event";

interface LeonardoEventRegistrationFormProps {
  value: TenantEventRegistration | null | undefined;
  onChange: (value: TenantEventRegistration) => void;
}

export function LeonardoEventRegistrationForm({
  value,
  onChange,
}: LeonardoEventRegistrationFormProps) {
  const registration = normalizeEventRegistration(value);

  function patch(partial: Partial<TenantEventRegistration>) {
    onChange(normalizeEventRegistration({ ...registration, ...partial }));
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-xl border border-white/10 bg-black/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-leanme-fuchsia">
          Quote di iscrizione
        </p>
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
            È prevista una quota di pagamento?
          </legend>
          <div className="mt-2 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input
                type="radio"
                name="reg-paid"
                checked={registration.paid === true}
                onChange={() =>
                  patch({
                    paid: true,
                    fees:
                      registration.fees.length > 0
                        ? registration.fees
                        : [emptyRegistrationFee()],
                  })
                }
                className="accent-leanme-fuchsia"
              />
              Sì
            </label>
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input
                type="radio"
                name="reg-paid"
                checked={registration.paid === false}
                onChange={() => patch({ paid: false, fees: [] })}
                className="accent-leanme-fuchsia"
              />
              No
            </label>
          </div>
        </fieldset>

        {registration.paid ? (
          <div className="space-y-3">
            <p className="text-xs text-white/45">
              Tipologie di quota (es. specializzandi, medici, under 40) con
              importo e periodo di validità: la stessa voce può avere importi
              diversi avvicinandosi all&apos;evento.
            </p>
            {registration.fees.map((fee, index) => (
              <div
                key={fee.id}
                className="space-y-2 rounded-lg border border-white/10 bg-black/30 p-3"
              >
                <div className="grid gap-2 md:grid-cols-2">
                  <label className="block text-sm md:col-span-2">
                    <span className="mb-1 block text-white/60">
                      Descrizione quota
                    </span>
                    <input
                      value={fee.label}
                      onChange={(e) => {
                        const fees = [...registration.fees];
                        fees[index] = { ...fee, label: e.target.value };
                        patch({ fees });
                      }}
                      placeholder="Es. Specializzandi / Medici / Under 40"
                      className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-white/60">Importo</span>
                    <input
                      value={fee.amount}
                      onChange={(e) => {
                        const fees = [...registration.fees];
                        fees[index] = { ...fee, amount: e.target.value };
                        patch({ fees });
                      }}
                      placeholder="150,00"
                      className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-white/60">Note</span>
                    <input
                      value={fee.notes ?? ""}
                      onChange={(e) => {
                        const fees = [...registration.fees];
                        fees[index] = { ...fee, notes: e.target.value };
                        patch({ fees });
                      }}
                      className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-white/60">
                      Valida dal
                    </span>
                    <input
                      value={fee.validFrom}
                      onChange={(e) => {
                        const fees = [...registration.fees];
                        fees[index] = { ...fee, validFrom: e.target.value };
                        patch({ fees });
                      }}
                      placeholder="gg/mm/aaaa"
                      className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-white/60">
                      Valida fino al
                    </span>
                    <input
                      value={fee.validTo}
                      onChange={(e) => {
                        const fees = [...registration.fees];
                        fees[index] = { ...fee, validTo: e.target.value };
                        patch({ fees });
                      }}
                      placeholder="gg/mm/aaaa"
                      className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    patch({
                      fees: registration.fees.filter((_, i) => i !== index),
                    })
                  }
                  className="text-xs text-white/50 underline hover:text-white"
                >
                  Rimuovi riga
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                patch({ fees: [...registration.fees, emptyRegistrationFee()] })
              }
              className="rounded-md border border-white/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70 hover:border-white hover:text-white"
            >
              Aggiungi quota
            </button>
          </div>
        ) : null}
      </div>

      <div className="space-y-4 rounded-xl border border-white/10 bg-black/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-leanme-fuchsia">
          Rimborsi
        </p>
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
            Sono previsti rimborsi?
          </legend>
          <div className="mt-2 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input
                type="radio"
                name="reg-refunds"
                checked={registration.refundsEnabled === true}
                onChange={() => patch({ refundsEnabled: true })}
                className="accent-leanme-fuchsia"
              />
              Sì
            </label>
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input
                type="radio"
                name="reg-refunds"
                checked={registration.refundsEnabled === false}
                onChange={() =>
                  patch({ refundsEnabled: false, refundRules: "" })
                }
                className="accent-leanme-fuchsia"
              />
              No
            </label>
          </div>
        </fieldset>
        {registration.refundsEnabled ? (
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">Regole di rimborso</span>
            <textarea
              rows={4}
              value={registration.refundRules}
              onChange={(e) => patch({ refundRules: e.target.value })}
              placeholder="Es. rimborso 100% entro 30 gg, 50% entro 15 gg…"
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
        ) : null}
      </div>
    </div>
  );
}
