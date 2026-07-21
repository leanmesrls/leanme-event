"use client";

import { useState } from "react";

import { LeonardoSubSectionNav } from "@/components/lean-event/LeonardoSubSectionNav";
import { LEONARDO_CANVAS_SURFACE } from "@/components/lean-event/leonardo-ui";
import type { LeonardoEventSponsorRecord } from "@/types/lean-event";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function emptySponsor(): LeonardoEventSponsorRecord {
  return {
    id: newId(),
    contactId: null,
    companyName: "",
    contactName: "",
    agreementSummary: "",
    contractRef: "",
    sponsorshipType: "",
    amount: "",
    notes: "",
  };
}

type SponsorView = "insert" | "list";

interface LeonardoEventSponsorsPanelProps {
  sponsors: LeonardoEventSponsorRecord[];
  onChange: (sponsors: LeonardoEventSponsorRecord[]) => void;
  onSave: () => void;
  saving: boolean;
  message: string | null;
  /** Vista controllata (URL Anagrafiche › Sponsors) */
  view?: SponsorView;
  onViewChange?: (view: SponsorView) => void;
  panelTitle?: string;
}

function SponsorFields({
  sponsor,
  onPatch,
  onRemove,
}: {
  sponsor: LeonardoEventSponsorRecord;
  onPatch: (partial: Partial<LeonardoEventSponsorRecord>) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-black/40 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-white/60">Azienda / ente</span>
          <input
            value={sponsor.companyName}
            onChange={(e) => onPatch({ companyName: e.target.value })}
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-white/60">
            Referente (testo — rubrica in arrivo)
          </span>
          <input
            value={sponsor.contactName ?? ""}
            onChange={(e) => onPatch({ contactName: e.target.value })}
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-white/60">Tipo di sponsorizzazione</span>
          <input
            value={sponsor.sponsorshipType ?? ""}
            onChange={(e) => onPatch({ sponsorshipType: e.target.value })}
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-white/60">Importo</span>
          <input
            value={sponsor.amount ?? ""}
            onChange={(e) => onPatch({ amount: e.target.value })}
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
          />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block text-white/60">Riferimento contratto</span>
          <input
            value={sponsor.contractRef ?? ""}
            onChange={(e) => onPatch({ contractRef: e.target.value })}
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
          />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block text-white/60">Sintesi accordo</span>
          <textarea
            rows={2}
            value={sponsor.agreementSummary ?? ""}
            onChange={(e) => onPatch({ agreementSummary: e.target.value })}
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
          />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block text-white/60">Note</span>
          <textarea
            rows={2}
            value={sponsor.notes ?? ""}
            onChange={(e) => onPatch({ notes: e.target.value })}
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
          />
        </label>
      </div>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-white/50 underline hover:text-white"
        >
          Rimuovi sponsor
        </button>
      ) : null}
    </div>
  );
}

export function LeonardoEventSponsorsPanel({
  sponsors,
  onChange,
  onSave,
  saving,
  message,
  view: controlledView,
  onViewChange,
  panelTitle = "Sponsors",
}: LeonardoEventSponsorsPanelProps) {
  const [internalView, setInternalView] = useState<SponsorView>("list");
  const [draft, setDraft] = useState<LeonardoEventSponsorRecord>(() =>
    emptySponsor()
  );
  const view = controlledView ?? internalView;

  function setView(next: SponsorView) {
    if (onViewChange) {
      onViewChange(next);
    } else {
      setInternalView(next);
    }
  }

  function handleAddDraft() {
    const company = draft.companyName.trim();
    if (!company) {
      return;
    }
    onChange([
      ...sponsors,
      {
        ...draft,
        companyName: company,
        contactName: draft.contactName?.trim() ?? "",
        agreementSummary: draft.agreementSummary?.trim() ?? "",
        contractRef: draft.contractRef?.trim() ?? "",
        sponsorshipType: draft.sponsorshipType?.trim() ?? "",
        amount: draft.amount?.trim() ?? "",
        notes: draft.notes?.trim() ?? "",
      },
    ]);
    setDraft(emptySponsor());
    setView("list");
  }

  return (
    <section className={`${LEONARDO_CANVAS_SURFACE} space-y-4`}>
      <div>
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-white">
          {panelTitle}
        </h3>
        <p className="mt-2 text-sm text-white/55">
          Anagrafica commerciale dell&apos;evento: contatto, accordo, contratto e
          tipologia. Gli sponsor qui inseriti si possono selezionare nella
          Griglia tecnica ECM.
        </p>
      </div>

      <LeonardoSubSectionNav
        sections={[
          { id: "insert", label: "Inserisci" },
          { id: "list", label: "Visualizza elenco" },
        ]}
        active={view}
        onChange={setView}
      />

      {view === "insert" ? (
        <div className="space-y-4">
          <p className="text-xs text-white/45">
            Compila i dati del nuovo sponsor e aggiungilo all&apos;elenco evento.
          </p>
          <SponsorFields
            sponsor={draft}
            onPatch={(partial) => setDraft({ ...draft, ...partial })}
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleAddDraft}
              disabled={!draft.companyName.trim()}
              className="rounded-full bg-leanme-fuchsia px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark disabled:opacity-60"
            >
              Aggiungi all&apos;elenco
            </button>
            <button
              type="button"
              onClick={() => setDraft(emptySponsor())}
              className="rounded-md border border-white/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70 hover:border-white hover:text-white"
            >
              Pulisci
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {sponsors.length === 0 ? (
            <p className="text-sm text-white/45">
              Nessuno sponsor ancora. Usa Inserisci per aggiungerne uno.
            </p>
          ) : (
            sponsors.map((sponsor, index) => (
              <SponsorFields
                key={sponsor.id}
                sponsor={sponsor}
                onPatch={(partial) => {
                  const next = [...sponsors];
                  next[index] = { ...sponsor, ...partial };
                  onChange(next);
                }}
                onRemove={() =>
                  onChange(sponsors.filter((_, i) => i !== index))
                }
              />
            ))
          )}

          {message ? (
            <p className="text-sm text-leanme-fuchsia">{message}</p>
          ) : null}
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-full bg-leanme-fuchsia px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark disabled:opacity-60"
          >
            {saving ? "Salvataggio..." : "Salva sponsor"}
          </button>
        </div>
      )}
    </section>
  );
}
