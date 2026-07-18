"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { LEONARDO_PAGE_TITLE } from "@/components/lean-event/leonardo-ui";
import {
  formatDocumentBytes,
  formatDocumentKind,
  LEAN_EVENT_DOCUMENT_KIND_OPTIONS,
  type LeanEventDocumentKind,
} from "@/lib/lean-event/document-kinds";
import { leanEventLeonardoPath } from "@/lib/lean-event/paths";

interface LeonardoDocumentRow {
  id: string;
  kind: LeanEventDocumentKind;
  title?: string | null;
  filename: string;
  bytes: number;
  updatedAt: string;
}

interface LeonardoDocumentsPanelProps {
  tenantSlug: string;
}

const PAGE_SIZE = 25;

export function LeonardoDocumentsPanel({
  tenantSlug,
}: LeonardoDocumentsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<LeonardoDocumentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [kindFilter, setKindFilter] = useState<"" | LeanEventDocumentKind>("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadKind, setUploadKind] = useState<LeanEventDocumentKind>("cv");
  const [uploadTitle, setUploadTitle] = useState("");

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    if (kindFilter) {
      params.set("kind", kindFilter);
    }
    const response = await fetch(`/api/lean-event/documents?${params}`, {
      credentials: "same-origin",
    });
    const payload = (await response.json()) as {
      items?: LeonardoDocumentRow[];
      total?: number;
      error?: string;
    };
    setLoading(false);
    if (!response.ok) {
      setError(payload.error ?? "Caricamento documenti non riuscito.");
      setItems([]);
      setTotal(0);
      return;
    }
    setItems(payload.items ?? []);
    setTotal(payload.total ?? 0);
  }, [kindFilter, offset]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    setOffset(0);
  }, [kindFilter]);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    setMessage(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", uploadKind);
    if (uploadTitle.trim()) {
      formData.append("title", uploadTitle.trim());
    }
    const response = await fetch("/api/lean-event/documents", {
      method: "POST",
      credentials: "same-origin",
      body: formData,
    });
    const payload = (await response.json()) as {
      document?: LeonardoDocumentRow;
      error?: string;
    };
    setUploading(false);
    if (!response.ok || !payload.document) {
      setError(payload.error ?? "Upload non riuscito.");
      return;
    }
    setMessage(`Caricato: ${payload.document.filename}`);
    setUploadTitle("");
    setOffset(0);
    await loadDocuments();
  }

  async function handleDelete(doc: LeonardoDocumentRow) {
    if (
      !window.confirm(
        `Spostare «${doc.title || doc.filename}» nel cestino documenti?`
      )
    ) {
      return;
    }
    setDeletingId(doc.id);
    setError(null);
    const response = await fetch(`/api/lean-event/documents/${doc.id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    setDeletingId(null);
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Eliminazione non riuscita.");
      return;
    }
    setMessage("Documento spostato nel cestino (retention 30 giorni).");
    await loadDocuments();
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={leanEventLeonardoPath(tenantSlug)}
          className="text-xs font-semibold uppercase tracking-[0.1em] text-leanme-fuchsia"
        >
          ← Cruscotto
        </Link>
        <h2 className={`mt-3 ${LEONARDO_PAGE_TITLE}`}>Documenti</h2>
        <p className="mt-1 text-sm text-white/60">
          Registry Neon + Blob: CV, attestati, pack faculty, accordi. Liste
          paginate, download autenticato.
        </p>
      </div>

      {message ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {error}
        </p>
      ) : null}

      <section className="leonardo-canvas rounded-xl border border-zinc-300/70 bg-[#f5f5f7] p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-leanme-fuchsia">
          Carica documento
        </h3>
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(160px,220px)_1fr_auto]">
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">Tipo</span>
            <select
              value={uploadKind}
              onChange={(event) =>
                setUploadKind(event.target.value as LeanEventDocumentKind)
              }
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            >
              {LEAN_EVENT_DOCUMENT_KIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">Titolo (opzionale)</span>
            <input
              value={uploadTitle}
              onChange={(event) => setUploadTitle(event.target.value)}
              placeholder="Es. CV Rossi 2026"
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-full bg-leanme-fuchsia px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark disabled:opacity-60 md:w-auto"
            >
              {uploading ? "Caricamento…" : "Scegli file"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleUpload(file);
                }
                event.target.value = "";
              }}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">Filtra per tipo</span>
            <select
              value={kindFilter}
              onChange={(event) =>
                setKindFilter(
                  event.target.value as "" | LeanEventDocumentKind
                )
              }
              className="min-w-[200px] rounded-lg border border-white/15 bg-[#111111] px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            >
              <option value="">Tutti</option>
              {LEAN_EVENT_DOCUMENT_KIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs uppercase tracking-[0.1em] text-white/45">
            {total} documenti · pagina {currentPage}/{pageCount}
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-white/50">Caricamento…</p>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-[#111111] p-6 text-sm text-white/60">
            Nessun documento in registry. Carica il primo file sopra.
          </p>
        ) : (
          <div className="leonardo-canvas overflow-hidden rounded-xl border border-zinc-300/70 bg-[#f5f5f7] shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-[#ebebef] text-left text-xs uppercase tracking-[0.1em] text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Titolo / file</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Dimensione</th>
                  <th className="px-4 py-3">Aggiornato</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-t border-zinc-300/70 bg-[#f5f5f7]"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">
                        {doc.title || doc.filename}
                      </p>
                      {doc.title ? (
                        <p className="text-xs text-white/45">{doc.filename}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {formatDocumentKind(doc.kind)}
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {formatDocumentBytes(doc.bytes)}
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {new Date(doc.updatedAt).toLocaleString("it-IT")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <a
                          href={`/api/lean-event/documents/${doc.id}/file`}
                          className="rounded-full border border-white/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white transition hover:border-leanme-fuchsia"
                        >
                          Scarica
                        </a>
                        <button
                          type="button"
                          disabled={deletingId === doc.id}
                          onClick={() => {
                            void handleDelete(doc);
                          }}
                          className="rounded-full border border-red-400/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-red-200 transition hover:border-red-300 disabled:opacity-60"
                        >
                          {deletingId === doc.id ? "…" : "Elimina"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > PAGE_SIZE ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={offset <= 0 || loading}
              onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white disabled:opacity-40"
            >
              Precedente
            </button>
            <button
              type="button"
              disabled={offset + PAGE_SIZE >= total || loading}
              onClick={() => setOffset((value) => value + PAGE_SIZE)}
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white disabled:opacity-40"
            >
              Successiva
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
