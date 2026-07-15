"use client";

import { useRef, useState } from "react";

import { LEANYOU_IMPORT_TEMPLATE_PATHS } from "@/lib/leanyou/import-schemas";
import type { LeanYouImportResult } from "@/types/leanyou";

interface LeonardoBulkImportProps {
  kind: "contacts" | "venues";
  onImported?: () => void;
}

const labels = {
  contacts: {
    title: "Importazione massiva rubrica",
    template: "Scarica modello Excel contatti",
    endpoint: "/api/leanyou/contacts/import",
  },
  venues: {
    title: "Importazione massiva sedi",
    template: "Scarica modello Excel sedi",
    endpoint: "/api/leanyou/venues/import",
  },
} as const;

export function LeonardoBulkImport({ kind, onImported }: LeonardoBulkImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LeanYouImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const copy = labels[kind];

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(copy.endpoint, {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });
      const payload = (await response.json()) as LeanYouImportResult & {
        error?: string;
        ok?: boolean;
      };

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Importazione non riuscita.");
        return;
      }

      setResult({
        created: payload.created,
        updated: payload.updated ?? 0,
        skipped: payload.skipped,
        errors: payload.errors,
      });
      onImported?.();
    } catch {
      setError("Importazione non riuscita.");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  return (
    <section className="rounded-xl border border-white/10 bg-[#111111] p-5">
      <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-leanme-fuchsia">
        {copy.title}
      </h3>
      <p className="mt-2 text-sm text-white/60">
        Compila il foglio «Dati» del modello Excel (puoi eliminare la riga di
        esempio), poi carica il file .xlsx o .csv.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href={LEANYOU_IMPORT_TEMPLATE_PATHS[kind]}
          download
          className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:border-leanme-fuchsia"
        >
          {copy.template}
        </a>
        <button
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className="rounded-full bg-leanme-fuchsia px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark disabled:opacity-60"
        >
          {loading ? "Importazione..." : "Carica file"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.txt"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-4 space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          <p>
            Import completato: {result.created} creati
            {result.updated ? `, ${result.updated} aggiornati` : ""}, {result.skipped}{" "}
            saltati
            {result.errors.length
              ? `, ${result.errors.length} errori`
              : ""}
            .
          </p>
          {result.errors.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-emerald-50/90">
              {result.errors.slice(0, 8).map((entry) => (
                <li key={`${entry.row}-${entry.message}`}>
                  Riga {entry.row}: {entry.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
