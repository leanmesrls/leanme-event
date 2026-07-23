"use client";

import { useMemo, useState } from "react";

import eventsConfig from "@/data/lean-event/events-config.json";
import {
  extractEmailsFromMatrix,
  extractEmailsFromText,
  parseGuestListPaste,
} from "@/lib/lean-event/guest-list-import";
import type { EventAssignmentWithContact } from "@/lib/lean-event/event-assignments";
import type {
  LeanEventContact,
  TenantEventRoleCategory,
} from "@/types/lean-event";

const roleCategories = eventsConfig.roleCategories as Array<{
  id: TenantEventRoleCategory;
  label: string;
}>;

interface LeonardoEventGuestListImportProps {
  eventId: string;
  contacts: LeanEventContact[];
  mode: "file" | "paste";
  onAssigned: (assignments: EventAssignmentWithContact[]) => void;
}

export function LeonardoEventGuestListImport({
  eventId,
  contacts,
  mode,
  onAssigned,
}: LeonardoEventGuestListImportProps) {
  const [roleCategory, setRoleCategory] =
    useState<TenantEventRoleCategory>("ospite");
  const [pasteText, setPasteText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedEmails, setParsedEmails] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const contactsByEmail = useMemo(() => {
    const map = new Map<string, LeanEventContact>();
    for (const contact of contacts) {
      if (contact.email?.trim()) {
        map.set(contact.email.trim().toLowerCase(), contact);
      }
    }
    return map;
  }, [contacts]);

  const matchPreview = useMemo(() => {
    const matched: LeanEventContact[] = [];
    const unknown: string[] = [];
    for (const email of parsedEmails) {
      const contact = contactsByEmail.get(email);
      if (contact) {
        matched.push(contact);
      } else {
        unknown.push(email);
      }
    }
    return { matched, unknown };
  }, [parsedEmails, contactsByEmail]);

  async function parseFile(file: File) {
    setError(null);
    setFileName(file.name);
    const buffer = await file.arrayBuffer();
    const lower = file.name.toLowerCase();

    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
      if (!sheet) {
        setError("Foglio Excel vuoto.");
        setParsedEmails([]);
        return;
      }
      const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
        header: 1,
        defval: "",
      }) as string[][];
      setParsedEmails(extractEmailsFromMatrix(rows));
      return;
    }

    const text = new TextDecoder("utf-8").decode(buffer);
    const matrix = parseGuestListPaste(text);
    setParsedEmails(
      matrix.length > 0 ? extractEmailsFromMatrix(matrix) : extractEmailsFromText(text)
    );
  }

  function handlePastePreview() {
    setError(null);
    setFileName(null);
    const matrix = parseGuestListPaste(pasteText);
    setParsedEmails(
      matrix.length > 0
        ? extractEmailsFromMatrix(matrix)
        : extractEmailsFromText(pasteText)
    );
  }

  async function handleAssign() {
    if (matchPreview.matched.length === 0) {
      setError("Nessun contatto in rubrica corrisponde alle email trovate.");
      return;
    }

    setPending(true);
    setError(null);

    const response = await fetch(`/api/lean-event/events/${eventId}/assignments/bulk`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roleCategory,
        source: {
          type: "contact_ids",
          contactIds: matchPreview.matched.map((contact) => contact.id),
        },
      }),
    });

    const payload = (await response.json()) as {
      error?: string;
      assignments?: EventAssignmentWithContact[];
      created?: number;
      skipped?: number;
    };
    setPending(false);

    if (!response.ok || !payload.assignments) {
      setError(payload.error ?? "Import non riuscito.");
      return;
    }

    onAssigned(payload.assignments);
    setPasteText("");
    setParsedEmails([]);
    setFileName(null);
  }

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-black/30 p-4">
      <p className="text-sm text-white/60">
        {mode === "file"
          ? "Carica un file Excel o CSV con almeno una colonna email. I contatti devono essere già in rubrica."
          : "Incolla righe da Excel (tabulazione) o elenco email. Una email per cella o per riga."}
      </p>

      {mode === "file" ? (
        <label className="block cursor-pointer rounded-lg border border-dashed border-white/20 px-4 py-6 text-center text-sm text-white/55 transition hover:border-leanme-fuchsia">
          {fileName ? `File: ${fileName}` : "Clicca per selezionare Excel / CSV"}
          <input
            type="file"
            accept=".csv,.xlsx,.xls,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void parseFile(file);
              }
              event.target.value = "";
            }}
          />
        </label>
      ) : (
        <>
          <textarea
            rows={6}
            value={pasteText}
            onChange={(event) => setPasteText(event.target.value)}
            placeholder="email@dominio.it&#9;Nome&#9;Cognome&#10;altro@dominio.it"
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
          />
          <button
            type="button"
            onClick={handlePastePreview}
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white hover:border-leanme-fuchsia"
          >
            Analizza testo
          </button>
        </>
      )}

      <label className="block text-sm">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
          Ruolo assegnazione
        </span>
        <select
          value={roleCategory}
          onChange={(event) =>
            setRoleCategory(event.target.value as TenantEventRoleCategory)
          }
          className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
        >
          {roleCategories.map((role) => (
            <option key={role.id} value={role.id}>
              {role.label}
            </option>
          ))}
        </select>
      </label>

      {parsedEmails.length > 0 ? (
        <div className="rounded-lg border border-white/10 bg-black/40 p-3 text-sm text-white/70">
          <p>
            {parsedEmails.length} email trovate · {matchPreview.matched.length} in
            rubrica
            {matchPreview.unknown.length > 0
              ? ` · ${matchPreview.unknown.length} non trovate`
              : ""}
          </p>
          {matchPreview.unknown.length > 0 ? (
            <p className="mt-2 text-xs text-amber-200/80">
              Non in rubrica: {matchPreview.unknown.slice(0, 5).join(", ")}
              {matchPreview.unknown.length > 5 ? "…" : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <button
        type="button"
        disabled={pending || matchPreview.matched.length === 0}
        onClick={() => void handleAssign()}
        className="rounded-full bg-leanme-fuchsia px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark disabled:opacity-50"
      >
        {pending
          ? "Assegnazione…"
          : `Assegna ${matchPreview.matched.length} ospiti`}
      </button>
    </div>
  );
}
