"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { LeanAgentAiPoweredBy } from "@/components/lean-event/LeanAgentAiPoweredBy";
import {
  LeonardoPageHeader,
  LEONARDO_PAGE_ACTION_BUTTON,
} from "@/components/lean-event/LeonardoPageHeader";
import type {
  TeresaChatMessage,
  TeresaSuperviseThreadSummary,
} from "@/types/lean-event";
import { cn } from "@/lib/utils";

const RAIL_STORAGE_KEY = "lean-event.teresa-supervise-rail";
const RAIL_MIN = 280;
const RAIL_MAX = 440;
const RAIL_DEFAULT = 320;

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat("it-IT", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/**
 * Supervisione globale conversazioni Teresa — solo operatori LeanMe.
 * Source of truth: Neon / Blob (non OpenAI dashboard).
 */
export function LeonardoTeresaSupervisePanel() {
  const [railOpen, setRailOpen] = useState(true);
  const [railWidth, setRailWidth] = useState(RAIL_DEFAULT);
  const [threads, setThreads] = useState<TeresaSuperviseThreadSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TeresaChatMessage[]>([]);
  const [query, setQuery] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RAIL_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as { open?: boolean; width?: number };
      if (typeof parsed.open === "boolean") {
        setRailOpen(parsed.open);
      }
      if (typeof parsed.width === "number") {
        setRailWidth(Math.min(RAIL_MAX, Math.max(RAIL_MIN, parsed.width)));
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        RAIL_STORAGE_KEY,
        JSON.stringify({ open: railOpen, width: railWidth })
      );
    } catch {
      /* ignore */
    }
  }, [railOpen, railWidth]);

  const loadThreads = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const response = await fetch("/api/lean-event/teresa/supervise", {
        credentials: "same-origin",
      });
      const payload = (await response.json()) as {
        error?: string;
        threads?: TeresaSuperviseThreadSummary[];
      };
      if (!response.ok) {
        setError(payload.error ?? "Impossibile caricare le conversazioni.");
        setThreads([]);
        return;
      }
      setThreads(payload.threads ?? []);
    } catch {
      setError("Connessione non riuscita.");
      setThreads([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  const loadDetail = useCallback(
    async (thread: TeresaSuperviseThreadSummary) => {
      setSelectedId(thread.id);
      setSelectedTenantId(thread.tenantId);
      setLoadingDetail(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          threadId: thread.id,
          tenantId: thread.tenantId,
        });
        const response = await fetch(
          `/api/lean-event/teresa/supervise?${params.toString()}`,
          { credentials: "same-origin" }
        );
        const payload = (await response.json()) as {
          error?: string;
          messages?: TeresaChatMessage[];
        };
        if (!response.ok) {
          setError(payload.error ?? "Conversazione non disponibile.");
          setMessages([]);
          return;
        }
        setMessages(payload.messages ?? []);
      } catch {
        setError("Connessione non riuscita.");
        setMessages([]);
      } finally {
        setLoadingDetail(false);
      }
    },
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return threads;
    }
    return threads.filter((thread) => {
      const haystack = [
        thread.tenantName,
        thread.tenantSlug,
        thread.userName,
        thread.userEmail,
        thread.title,
        thread.lastUserPreview,
        thread.lastAssistantPreview,
        thread.lastContextLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [threads, query]);

  const selected =
    threads.find(
      (thread) =>
        thread.id === selectedId && thread.tenantId === selectedTenantId
    ) ?? null;

  function onResizePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = railWidth;

    const onMove = (moveEvent: PointerEvent) => {
      const next = startWidth + (moveEvent.clientX - startX);
      setRailWidth(Math.min(RAIL_MAX, Math.max(RAIL_MIN, next)));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div className="space-y-4">
      <LeonardoPageHeader
        title="Supervisione Teresa"
        poweredBy={<LeanAgentAiPoweredBy agent="teresa" />}
        subtitle="Vista globale LeanMe — conversazioni Teresa di tutti i tenant. Solo lettura da Neon/Blob."
        action={
          <button
            type="button"
            onClick={() => void loadThreads()}
            className={LEONARDO_PAGE_ACTION_BUTTON}
          >
            Aggiorna
          </button>
        }
      />

      <div className="flex min-h-[min(70vh,720px)] overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a]">
        <aside
          className={cn(
            "relative flex shrink-0 flex-col border-r border-white/10 bg-black/40",
            railOpen ? "" : "w-12"
          )}
          style={railOpen ? { width: railWidth } : undefined}
          aria-label="Elenco conversazioni Teresa (globale)"
        >
          {railOpen ? (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Ridimensiona elenco supervisione"
              onPointerDown={onResizePointerDown}
              className="absolute inset-y-0 right-0 z-10 w-1.5 cursor-col-resize touch-none hover:bg-leanme-fuchsia/40"
            />
          ) : null}

          {!railOpen ? (
            <button
              type="button"
              onClick={() => setRailOpen(true)}
              className="flex h-full flex-col items-center gap-3 px-2 py-4 text-white/60 transition hover:text-white"
              aria-label="Apri elenco supervisione"
              title="Apri elenco"
            >
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ writingMode: "vertical-rl" }}
              >
                Supervisione
              </span>
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-leanme-fuchsia">
                    Tutti i tenant
                  </p>
                  <p className="truncate text-xs text-white/45">
                    {loadingList
                      ? "Caricamento…"
                      : `${filtered.length} thread`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRailOpen(false)}
                  className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border border-white/15 text-white/60 hover:text-white"
                  aria-label="Comprimi elenco"
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      d="M15 6l-6 6 6 6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

              <div className="border-b border-white/10 p-3">
                <label className="sr-only" htmlFor="teresa-supervise-search">
                  Cerca tenant, utente o messaggio
                </label>
                <input
                  id="teresa-supervise-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cerca tenant, utente, testo…"
                  className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
                />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {filtered.length === 0 && !loadingList ? (
                  <p className="px-3 py-4 text-sm text-white/45">
                    Nessuna conversazione Teresa nei tenant.
                  </p>
                ) : null}
                <ul className="divide-y divide-white/5">
                  {filtered.map((thread) => {
                    const active =
                      thread.id === selectedId &&
                      thread.tenantId === selectedTenantId;
                    return (
                      <li key={`${thread.tenantId}:${thread.id}`}>
                        <button
                          type="button"
                          onClick={() => void loadDetail(thread)}
                          className={cn(
                            "w-full px-3 py-3 text-left transition",
                            active
                              ? "bg-leanme-fuchsia/15"
                              : "hover:bg-white/[0.04]"
                          )}
                        >
                          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-leanme-fuchsia/90">
                            {thread.tenantName}
                          </p>
                          <p className="truncate text-sm font-medium text-white">
                            {thread.userName}
                          </p>
                          <p className="truncate text-xs text-white/45">
                            {thread.userEmail}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs text-white/60">
                            {thread.lastUserPreview ??
                              thread.title ??
                              "—"}
                          </p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-white/35">
                            {thread.userMessageCount} domande ·{" "}
                            {formatWhen(thread.updatedAt)}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}
        </aside>

        <section className="flex min-w-0 flex-1 flex-col bg-[#111111]">
          {selected ? (
            <div className="border-b border-white/10 px-4 py-3 sm:px-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-leanme-fuchsia">
                {selected.tenantName} · {selected.tenantSlug}
              </p>
              <p className="text-sm font-semibold text-white">
                {selected.userName}
              </p>
              <p className="text-xs text-white/50">
                {selected.userEmail} · aggiornato{" "}
                {formatWhen(selected.updatedAt)}
              </p>
              {selected.lastContextLabel ? (
                <p className="mt-1 text-[11px] text-white/40">
                  Ultimo contesto: {selected.lastContextLabel}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="border-b border-white/10 px-4 py-3 sm:px-5">
              <p className="text-sm text-white/55">
                Seleziona una conversazione nella colonna sinistra.
              </p>
            </div>
          )}

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
            {error ? (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            ) : null}
            {loadingDetail ? (
              <p className="text-sm text-white/45">Caricamento transcript…</p>
            ) : null}
            {!loadingDetail && selected && messages.length === 0 ? (
              <p className="text-sm text-white/45">Thread vuoto.</p>
            ) : null}
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-3xl rounded-lg px-3 py-2.5 text-sm",
                  message.role === "user"
                    ? "border border-white/15 bg-black/50 text-white"
                    : "border border-leanme-fuchsia/25 bg-leanme-fuchsia/10 text-white/90"
                )}
              >
                <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">
                  <span
                    className={
                      message.role === "assistant" ? "text-leanme-fuchsia" : ""
                    }
                  >
                    {message.role === "assistant" ? "Teresa" : "Utente"}
                  </span>
                  <span>·</span>
                  <span>{formatWhen(message.createdAt)}</span>
                  {message.contextLabel ? (
                    <>
                      <span>·</span>
                      <span className="normal-case tracking-normal text-white/35">
                        {message.contextLabel}
                      </span>
                    </>
                  ) : null}
                </div>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
