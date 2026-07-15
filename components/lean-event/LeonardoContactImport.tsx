"use client";

import { useEffect, useRef, useState } from "react";

import {
  autoMapPasteHeaders,
  buildRowsFromPasteMapping,
  PASTE_COLUMN_OPTIONS,
  parsePasteText,
  pasteHeadersLookLikeData,
  type PasteColumnMapping,
} from "@/lib/lean-event/contact-paste-import";
import { LEAN_EVENT_IMPORT_TEMPLATE_PATHS } from "@/lib/lean-event/import-schemas";
import type {
  ContactImportConflict,
  ContactImportFieldAction,
  ContactImportFieldKey,
  ContactImportPreview,
  LeanEventImportResult,
} from "@/types/lean-event";

interface LeonardoContactImportProps {
  compact?: boolean;
  onImported?: () => void;
}

type FieldDecisions = Record<
  number,
  Partial<Record<ContactImportFieldKey, ContactImportFieldAction>>
>;

type InputMode = "file" | "paste";
type ImportSource = "file" | "paste";

const FIELD_ACTION_LABELS: Record<ContactImportFieldAction, string> = {
  keep: "Mantieni",
  overwrite: "Sovrascrivi",
  merge: "Aggiungi",
};

function buildDefaultDecisions(conflicts: ContactImportConflict[]): FieldDecisions {
  const decisions: FieldDecisions = {};
  for (const conflict of conflicts) {
    decisions[conflict.rowNumber] = {};
    for (const field of conflict.fields) {
      if (field.differs) {
        decisions[conflict.rowNumber]![field.field] = "keep";
      }
    }
  }
  return decisions;
}

function buildResolutions(
  conflicts: ContactImportConflict[],
  decisions: FieldDecisions
) {
  return conflicts.map((conflict) => ({
    rowNumber: conflict.rowNumber,
    contactId: conflict.existingContactId,
    fields: decisions[conflict.rowNumber] ?? {},
  }));
}

function ImportPreviewPanel({
  preview,
  decisions,
  applying,
  onApply,
  onReset,
  onFieldDecision,
}: {
  preview: ContactImportPreview;
  decisions: FieldDecisions;
  applying: boolean;
  onApply: (overwriteAll: boolean) => void;
  onReset: () => void;
  onFieldDecision: (
    rowNumber: number,
    field: ContactImportFieldKey,
    action: ContactImportFieldAction
  ) => void;
}) {
  const canImport = preview.newRows.length > 0 || preview.conflicts.length > 0;

  if (!canImport) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
        <p className="font-semibold">Nessun contatto importabile</p>
        {preview.errors.length > 0 ? (
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">
            {preview.errors.map((entry) => (
              <li key={`${entry.row}-${entry.message}`}>
                Riga {entry.row}: {entry.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs">
            Verifica intestazioni Nome/Cognome o mappa le colonne nel passaggio
            precedente.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80">
        {preview.newRows.length} nuovi · {preview.conflicts.length} duplicati
        {preview.errors.length ? ` · ${preview.errors.length} scartati` : ""}
      </div>

      {preview.errors.length > 0 ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          <p className="font-semibold">Righe scartate</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
            {preview.errors.map((entry) => (
              <li key={`${entry.row}-${entry.message}`}>
                Riga {entry.row}: {entry.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {preview.conflicts.map((conflict) => (
        <article
          key={conflict.rowNumber}
          className="rounded-lg border border-white/10 bg-black/20 p-3"
        >
          <header className="mb-2 border-b border-white/10 pb-2">
            <h4 className="text-sm font-semibold text-white">
              Riga {conflict.rowNumber} · duplicato (
              {conflict.matchedBy === "email" ? "email" : "CF"})
            </h4>
            <p className="text-xs text-white/50">
              {conflict.incoming.firstName} {conflict.incoming.lastName}
            </p>
          </header>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-white/50">
                  <th className="py-1.5 pr-3">Campo</th>
                  <th className="py-1.5 pr-3">In rubrica</th>
                  <th className="py-1.5 pr-3">Da importare</th>
                  <th className="py-1.5">Azione</th>
                </tr>
              </thead>
              <tbody>
                {conflict.fields.map((field) => (
                  <tr key={field.field} className="border-b border-white/5 align-top">
                    <td className="py-2 pr-3 font-medium text-white/80">{field.label}</td>
                    <td className="max-w-[140px] py-2 pr-3 whitespace-pre-wrap text-white/70">
                      {field.existing}
                    </td>
                    <td className="max-w-[140px] py-2 pr-3 whitespace-pre-wrap text-white/70">
                      {field.incoming}
                    </td>
                    <td className="py-2">
                      {!field.differs ? (
                        <span className="text-white/40">=</span>
                      ) : (
                        <select
                          value={decisions[conflict.rowNumber]?.[field.field] ?? "keep"}
                          onChange={(event) =>
                            onFieldDecision(
                              conflict.rowNumber,
                              field.field,
                              event.target.value as ContactImportFieldAction
                            )
                          }
                          className="rounded border border-white/15 bg-black px-2 py-1 text-white"
                        >
                          {(
                            Object.keys(FIELD_ACTION_LABELS) as ContactImportFieldAction[]
                          ).map((action) => (
                            <option key={action} value={action}>
                              {FIELD_ACTION_LABELS[action]}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ))}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={applying}
          onClick={() => onApply(false)}
          className="rounded-full bg-leanme-fuchsia px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark disabled:opacity-60"
        >
          {applying
            ? "Importazione…"
            : preview.conflicts.length
              ? "Conferma importazione"
              : `Importa ${preview.newRows.length} contatt${
                  preview.newRows.length === 1 ? "o" : "i"
                }`}
        </button>
        {preview.conflicts.length > 0 ? (
          <button
            type="button"
            disabled={applying}
            onClick={() => onApply(true)}
            className="rounded-full border border-amber-400/50 bg-amber-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-amber-100 transition hover:border-amber-300 disabled:opacity-60"
          >
            Sovrascrivi tutto
          </button>
        ) : null}
        <button
          type="button"
          disabled={applying}
          onClick={onReset}
          className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white/70 transition hover:border-white/40"
        >
          Annulla
        </button>
      </div>
    </div>
  );
}

export function LeonardoContactImport({
  compact = false,
  onImported,
}: LeonardoContactImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const [inputMode, setInputMode] = useState<InputMode>("file");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [importRows, setImportRows] = useState<Record<string, string>[] | null>(null);
  const [importSource, setImportSource] = useState<ImportSource>("file");
  const [preview, setPreview] = useState<ContactImportPreview | null>(null);
  const [decisions, setDecisions] = useState<FieldDecisions>({});
  const [result, setResult] = useState<LeanEventImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [pasteText, setPasteText] = useState("");
  const [pasteMappings, setPasteMappings] = useState<PasteColumnMapping[]>([]);
  const [pasteHeaderRowIndex, setPasteHeaderRowIndex] = useState(0);
  const [pasteMatrix, setPasteMatrix] = useState<string[][]>([]);
  const [pasteReady, setPasteReady] = useState(false);
  const [treatFirstRowAsData, setTreatFirstRowAsData] = useState(false);

  useEffect(() => {
    if (preview || error || result) {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [preview, error, result]);

  function resetState() {
    setPreview(null);
    setDecisions({});
    setResult(null);
    setError(null);
    setStatus(null);
    setFile(null);
    setFileLabel(null);
    setImportRows(null);
    setPasteReady(false);
  }

  async function runPreview(
    rows: Record<string, string>[],
    source: ImportSource,
    label: string
  ) {
    setLoading(true);
    setError(null);
    setResult(null);
    setPreview(null);
    setDecisions({});
    setStatus(`Analisi di ${label} in corso…`);

    try {
      const response = await fetch("/api/lean-event/contacts/import/preview", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const payload = (await response.json()) as ContactImportPreview & {
        error?: string;
        ok?: boolean;
        parseInfo?: { sheetName?: string; rawRowCount?: number };
      };

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Anteprima importazione non riuscita.");
        setStatus(null);
        return;
      }

      setImportRows(rows);
      setImportSource(source);
      setPreview({
        newRows: payload.newRows,
        conflicts: payload.conflicts,
        errors: payload.errors,
      });
      setDecisions(buildDefaultDecisions(payload.conflicts));

      const total =
        payload.newRows.length + payload.conflicts.length + payload.errors.length;

      if (total === 0) {
        setError(
          "Nessun contatto riconosciuto. Controlla che ci siano colonne Nome e Cognome (nel file Excel usa il foglio «Dati»)."
        );
        setStatus(null);
        return;
      }

      setStatus(
        `Analisi completata: ${payload.newRows.length} nuovi, ${payload.conflicts.length} duplicati${
          payload.errors.length ? `, ${payload.errors.length} righe scartate` : ""
        }.`
      );
    } catch {
      setError("Anteprima importazione non riuscita.");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) {
      return;
    }

    setFile(selected);
    setFileLabel(selected.name);

    const formData = new FormData();
    formData.append("file", selected);

    setLoading(true);
    setError(null);
    setResult(null);
    setPreview(null);
    setDecisions({});
    setStatus(`Analisi di «${selected.name}» in corso…`);

    try {
      const response = await fetch("/api/lean-event/contacts/import/preview", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });
      const payload = (await response.json()) as ContactImportPreview & {
        error?: string;
        ok?: boolean;
        parseInfo?: { sheetName?: string; rawRowCount?: number };
      };

      if (!response.ok || !payload.ok) {
        const detail = payload.parseInfo?.sheetName
          ? ` (foglio «${payload.parseInfo.sheetName}»)`
          : "";
        setError((payload.error ?? "Anteprima importazione non riuscita.") + detail);
        setStatus(null);
        return;
      }

      setImportSource("file");
      setImportRows(null);
      setPreview({
        newRows: payload.newRows,
        conflicts: payload.conflicts,
        errors: payload.errors,
      });
      setDecisions(buildDefaultDecisions(payload.conflicts));

      const total =
        payload.newRows.length + payload.conflicts.length + payload.errors.length;

      if (total === 0) {
        setError(
          "Nessun contatto riconosciuto nel file. Usa il foglio «Dati» con Nome e Cognome in prima riga, oppure prova «Copia e incolla» per mappare le colonne manualmente."
        );
        setStatus(null);
        return;
      }

      setStatus(
        `File analizzato${payload.parseInfo?.sheetName ? ` (foglio «${payload.parseInfo.sheetName}»)` : ""}: ${payload.newRows.length} nuovi, ${payload.conflicts.length} duplicati.`
      );
    } catch {
      setError("Anteprima importazione non riuscita.");
      setStatus(null);
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  function handleParsePaste() {
    setError(null);
    setResult(null);
    setPreview(null);

    const parsed = parsePasteText(pasteText);
    if (parsed.matrix.length === 0) {
      setError("Incolla almeno una riga di dati.");
      return;
    }

    const looksLikeData = pasteHeadersLookLikeData(parsed.headers);
    setTreatFirstRowAsData(looksLikeData);

    let headerRowIndex = parsed.headerRowIndex;
    const headers = parsed.headers;

    if (looksLikeData) {
      headerRowIndex = -1;
    }

    setPasteMatrix(parsed.matrix);
    setPasteHeaderRowIndex(headerRowIndex);
    setPasteMappings(
      autoMapPasteHeaders(
        looksLikeData
          ? (parsed.matrix[0] ?? []).map((_, index) => `Colonna ${index + 1}`)
          : headers
      )
    );
    setPasteReady(true);
    setStatus(
      looksLikeData
        ? "Prima riga rilevata come dati: mappa manualmente le colonne."
        : "Colonne rilevate: verifica il match e avvia l'anteprima."
    );
  }

  async function handlePastePreview() {
    if (!pasteReady || pasteMatrix.length === 0) {
      setError("Analizza prima i dati incollati.");
      return;
    }

    const hasNome = pasteMappings.some((mapping) => mapping.target === "Nome");
    const hasCognome = pasteMappings.some((mapping) => mapping.target === "Cognome");
    if (!hasNome || !hasCognome) {
      setError("Mappa almeno una colonna su Nome e una su Cognome.");
      return;
    }

    const effectiveHeaderRow = treatFirstRowAsData ? -1 : pasteHeaderRowIndex;
    const rows = buildRowsFromPasteMapping(pasteMatrix, effectiveHeaderRow, pasteMappings);

    if (rows.length === 0) {
      setError("Nessuna riga dati dopo la mappatura colonne.");
      return;
    }

    await runPreview(rows, "paste", "dati incollati");
  }

  async function handleApply(overwriteAll: boolean) {
    if (!preview) {
      return;
    }

    setApplying(true);
    setError(null);
    setResult(null);
    setStatus("Importazione in corso…");

    const payload = {
      overwriteAll,
      resolutions: overwriteAll ? [] : buildResolutions(preview.conflicts, decisions),
    };

    try {
      let response: Response;

      if (importSource === "paste" && importRows) {
        response = await fetch("/api/lean-event/contacts/import/apply", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, rows: importRows }),
        });
      } else if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("decisions", JSON.stringify(payload));
        response = await fetch("/api/lean-event/contacts/import/apply", {
          method: "POST",
          credentials: "same-origin",
          body: formData,
        });
      } else {
        setError("File o dati incollati non più disponibili. Ripeti l'anteprima.");
        setStatus(null);
        setApplying(false);
        return;
      }

      const resultPayload = (await response.json()) as LeanEventImportResult & {
        error?: string;
        ok?: boolean;
      };

      if (!response.ok || !resultPayload.ok) {
        setError(resultPayload.error ?? "Importazione non riuscita.");
        setStatus(null);
        return;
      }

      setResult({
        created: resultPayload.created,
        updated: resultPayload.updated,
        skipped: resultPayload.skipped,
        errors: resultPayload.errors,
      });
      setPreview(null);
      setDecisions({});
      setFile(null);
      setFileLabel(null);
      setImportRows(null);
      setPasteReady(false);
      setStatus(null);
      onImported?.();
    } catch {
      setError("Importazione non riuscita.");
      setStatus(null);
    } finally {
      setApplying(false);
    }
  }

  return (
    <section className={`rounded-xl border border-white/10 bg-[#111111] ${compact ? "p-4" : "p-5"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-leanme-fuchsia">
            Importazione massiva
          </h3>
          {!compact ? (
            <p className="mt-2 max-w-2xl text-sm text-white/60">
              Da file Excel (.xlsx) o copiando righe da foglio / email / altro
              gestionale, con mappatura colonne.
            </p>
          ) : null}
        </div>
        {fileLabel && inputMode === "file" ? (
          <span className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-white/60">
            {fileLabel}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex gap-2">
        {(
          [
            { id: "file", label: "File Excel" },
            { id: "paste", label: "Copia e incolla" },
          ] as const
        ).map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => {
              setInputMode(mode.id);
              resetState();
            }}
            className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${
              inputMode === mode.id
                ? "bg-white/15 text-white"
                : "border border-white/15 text-white/60 hover:border-white/30"
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {inputMode === "file" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={LEAN_EVENT_IMPORT_TEMPLATE_PATHS.contacts}
            download
            className="rounded-full border border-white/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:border-leanme-fuchsia sm:text-xs"
          >
            Scarica modello
          </a>
          <button
            type="button"
            disabled={loading || applying}
            onClick={() => inputRef.current?.click()}
            className="rounded-full bg-leanme-fuchsia px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark disabled:opacity-60 sm:text-xs"
          >
            {loading ? "Analisi…" : "Carica file Excel"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.txt"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <textarea
            value={pasteText}
            onChange={(event) => setPasteText(event.target.value)}
            placeholder={
              "Incolla qui righe da Excel o CSV.\nLa prima riga può essere l'intestazione oppure solo dati."
            }
            rows={5}
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading || applying || !pasteText.trim()}
              onClick={handleParsePaste}
              className="rounded-full border border-white/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:border-leanme-fuchsia"
            >
              Analizza dati incollati
            </button>
            {pasteReady ? (
              <button
                type="button"
                disabled={loading || applying}
                onClick={handlePastePreview}
                className="rounded-full bg-leanme-fuchsia px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark disabled:opacity-60"
              >
                Anteprima import
              </button>
            ) : null}
          </div>

          {pasteReady ? (
            <div className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3">
              <label className="flex items-center gap-2 text-xs text-white/70">
                <input
                  type="checkbox"
                  checked={treatFirstRowAsData}
                  onChange={(event) => setTreatFirstRowAsData(event.target.checked)}
                  className="accent-leanme-fuchsia"
                />
                La prima riga contiene dati (non intestazioni)
              </label>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/45">
                Mappa colonne
              </p>
              <div className="space-y-2">
                {pasteMappings.map((mapping) => (
                  <div
                    key={mapping.columnIndex}
                    className="grid gap-2 sm:grid-cols-[1fr_1fr] sm:items-center"
                  >
                    <span className="truncate text-xs text-white/70">
                      {mapping.sourceHeader || `Colonna ${mapping.columnIndex + 1}`}
                    </span>
                    <select
                      value={mapping.target}
                      onChange={(event) => {
                        const target = event.target.value as PasteColumnMapping["target"];
                        setPasteMappings((current) =>
                          current.map((entry) =>
                            entry.columnIndex === mapping.columnIndex
                              ? { ...entry, target }
                              : entry
                          )
                        );
                      }}
                      className="rounded border border-white/15 bg-black px-2 py-1.5 text-xs text-white"
                    >
                      {PASTE_COLUMN_OPTIONS.map((option) => (
                        <option key={option.label} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      <div ref={previewRef} className="mt-3 space-y-3">
        {status ? (
          <p className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
            {status}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        {preview ? (
          <ImportPreviewPanel
            preview={preview}
            decisions={decisions}
            applying={applying}
            onApply={handleApply}
            onReset={resetState}
            onFieldDecision={(rowNumber, field, action) =>
              setDecisions((current) => ({
                ...current,
                [rowNumber]: { ...current[rowNumber], [field]: action },
              }))
            }
          />
        ) : null}

        {result ? (
          <div className="space-y-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            <p>
              Completato: {result.created} creati, {result.updated} aggiornati,{" "}
              {result.skipped} saltati
              {result.errors.length ? `, ${result.errors.length} errori` : ""}.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
