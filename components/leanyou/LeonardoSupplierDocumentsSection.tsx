"use client";

import { useMemo, useRef, useState } from "react";

import { LeonardoDateInput } from "@/components/leanyou/LeonardoDateInput";
import { LEONARDO_PANEL_TITLE } from "@/components/leanyou/leonardo-ui";
import {
  getSupplierDocumentKindLabel,
  sortSupplierDocuments,
} from "@/lib/leanyou/supplier-display";
import { cn } from "@/lib/utils";
import type {
  LeonardoSupplierDocument,
  LeonardoSupplierDocumentKind,
} from "@/types/leanyou";

interface LeonardoSupplierDocumentsSectionProps {
  title: string;
  description: string;
  documents: LeonardoSupplierDocument[];
  uploadUrl: string;
  allowedKinds: LeonardoSupplierDocumentKind[];
  defaultKind: LeonardoSupplierDocumentKind;
  /** Senza card esterna quando annidato in scheda fornitore */
  embedded?: boolean;
  /** Nasconde titolo/descrizione (es. dentro pannello collassabile) */
  hideTitle?: boolean;
  onUpdated: (documents: LeonardoSupplierDocument[]) => void;
}

export function LeonardoSupplierDocumentsSection({
  title,
  description,
  documents,
  uploadUrl,
  allowedKinds,
  defaultKind,
  embedded = false,
  hideTitle = false,
  onUpdated,
}: LeonardoSupplierDocumentsSectionProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    kind: defaultKind,
    documentDate: "",
    notes: "",
  });

  const sorted = useMemo(() => sortSupplierDocuments(documents), [documents]);

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Seleziona un file.");
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", form.title || file.name);
    formData.append("kind", form.kind);
    formData.append("documentDate", form.documentDate);
    formData.append("notes", form.notes);

    const response = await fetch(uploadUrl, {
      method: "POST",
      credentials: "same-origin",
      body: formData,
    });

    const payload = (await response.json()) as {
      error?: string;
      link?: { documents: LeonardoSupplierDocument[] };
      supplier?: { agreements: LeonardoSupplierDocument[] };
      document?: LeonardoSupplierDocument;
    };

    setUploading(false);

    if (!response.ok) {
      setError(payload.error ?? "Upload non riuscito.");
      return;
    }

    const nextDocuments =
      payload.link?.documents ??
      payload.supplier?.agreements ??
      (payload.document ? [...documents, payload.document] : documents);

    onUpdated(nextDocuments);
    setForm({ title: "", kind: defaultKind, documentDate: "", notes: "" });
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  return (
    <section
      className={cn(
        "space-y-4",
        embedded
          ? "border-t border-white/10 pt-6"
          : "rounded-xl border border-white/10 bg-[#111111] p-6"
      )}
    >
      <div>
        {!hideTitle ? (
          <>
            <h3 className={LEONARDO_PANEL_TITLE}>{title}</h3>
            <p className="mt-2 text-sm text-white/60">{description}</p>
          </>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {error}
        </p>
      ) : null}

      <form onSubmit={handleUpload} className="space-y-3 rounded-lg border border-white/10 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/45">
          Carica documento
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block text-white/60">Nome documento *</span>
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Es. Contratto quadro 2026"
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">Tipologia</span>
            <select
              value={form.kind}
              onChange={(event) =>
                setForm({
                  ...form,
                  kind: event.target.value as LeonardoSupplierDocumentKind,
                })
              }
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            >
              {allowedKinds.map((kind) => (
                <option key={kind} value={kind}>
                  {getSupplierDocumentKindLabel(kind)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">Data documento</span>
            <LeonardoDateInput
              value={form.documentDate}
              onChange={(documentDate) => setForm({ ...form, documentDate })}
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block text-white/60">File *</span>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
              className="w-full text-sm text-white/70 file:mr-3 file:rounded-md file:border-0 file:bg-leanme-fuchsia/20 file:px-3 file:py-2 file:text-xs file:font-semibold file:uppercase file:text-white"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block text-white/60">Note</span>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={uploading}
          className="rounded-full bg-leanme-fuchsia px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark disabled:opacity-60"
        >
          {uploading ? "Caricamento…" : "Archivia documento"}
        </button>
      </form>

      {sorted.length === 0 ? (
        <p className="text-sm text-white/45">Nessun documento archiviato.</p>
      ) : (
        <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
          {sorted.map((document) => (
            <li
              key={document.id}
              className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-white">{document.title}</p>
                <p className="mt-1 text-xs text-white/50">
                  {getSupplierDocumentKindLabel(document.kind)} · {document.documentDate}
                  {document.notes ? ` · ${document.notes}` : ""}
                </p>
                <p className="mt-1 text-[11px] text-white/35">
                  {document.fileName} · caricato da {document.uploadedBy}
                </p>
              </div>
              <a
                href={document.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-xs font-semibold uppercase tracking-[0.08em] text-leanme-fuchsia hover:underline"
              >
                Apri
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
