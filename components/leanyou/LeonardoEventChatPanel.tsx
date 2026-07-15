"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { formatEuropeanDate } from "@/lib/leanyou/dates";
import type { LeonardoEventChatAttachment, LeonardoEventChatMessage } from "@/types/leanyou";

interface LeonardoEventChatPanelProps {
  eventId: string;
  tenantSlug: string;
  currentUserName: string;
  currentUserEmail: string;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return `${formatEuropeanDate(iso)} ${date.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function LeonardoEventChatPanel({
  eventId,
  tenantSlug,
  currentUserName,
  currentUserEmail,
}: LeonardoEventChatPanelProps) {
  const [messages, setMessages] = useState<LeonardoEventChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const eventPath = `/leanyou/${tenantSlug}/leonardo/eventi/${eventId}`;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const response = await fetch(`/api/leanyou/events/${eventId}/chat`, {
        credentials: "same-origin",
      });
      const payload = (await response.json()) as {
        messages?: LeonardoEventChatMessage[];
      };
      if (!cancelled && response.ok && payload.messages) {
        setMessages(payload.messages);
      }
      if (!cancelled) {
        setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function uploadAttachment(file: File) {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(
      `/api/leanyou/events/${eventId}/chat/attachment`,
      { method: "POST", credentials: "same-origin", body: formData }
    );
    const payload = (await response.json()) as {
      error?: string;
      attachment?: LeonardoEventChatAttachment;
    };
    setUploading(false);
    if (!response.ok || !payload.attachment) {
      setError(payload.error ?? "Upload non riuscito.");
      return null;
    }
    return payload.attachment;
  }

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if (!text) {
      return;
    }

    setPending(true);
    setError(null);

    const links: Array<{ label: string; href: string }> = [];
    if (text.includes("scheda evento") || text.includes("evento")) {
      links.push({ label: "Scheda evento", href: eventPath });
    }

    const response = await fetch(`/api/leanyou/events/${eventId}/chat`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text, links: links.length ? links : undefined }),
    });

    const payload = (await response.json()) as {
      error?: string;
      message?: LeonardoEventChatMessage;
    };
    setPending(false);

    if (!response.ok || !payload.message) {
      setError(payload.error ?? "Invio non riuscito.");
      return;
    }

    setMessages((current) => [...current, payload.message!]);
    setBody("");
  }

  async function handleAttachAndSend(file: File) {
    const attachment = await uploadAttachment(file);
    if (!attachment) {
      return;
    }

    setPending(true);
    const response = await fetch(`/api/leanyou/events/${eventId}/chat`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: body.trim() || `Allegato: ${attachment.name}`,
        attachments: [attachment],
      }),
    });
    const payload = (await response.json()) as {
      message?: LeonardoEventChatMessage;
      error?: string;
    };
    setPending(false);
    if (response.ok && payload.message) {
      setMessages((current) => [...current, payload.message!]);
      setBody("");
    } else {
      setError(payload.error ?? "Invio allegato non riuscito.");
    }
  }

  const hint = useMemo(
    () =>
      `Scrivi come ${currentUserName}. Usa @email o @nome per citare una collega. Link rapido: incolla «scheda evento».`,
    [currentUserName]
  );

  return (
    <section className="flex min-h-[420px] flex-col rounded-xl border border-white/10 bg-[#111111]">
      <div className="border-b border-white/10 px-4 py-4 sm:px-6">
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-leanme-fuchsia">
          Chat evento
        </h3>
        <p className="mt-2 text-sm text-white/60">
          Scambio tra referenti sullo stesso evento. Ogni messaggio registra utente
          e orario.
        </p>
        <p className="mt-1 text-xs text-white/40">{hint}</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
        {loading ? (
          <p className="text-sm text-white/45">Caricamento messaggi…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-white/45">
            Nessun messaggio. Avvia la conversazione con il team evento.
          </p>
        ) : (
          messages.map((message) => {
            const isMine =
              message.authorEmail.toLowerCase() === currentUserEmail.toLowerCase();
            return (
              <article
                key={message.id}
                className={`max-w-[92%] rounded-xl border px-3 py-2.5 sm:max-w-[80%] ${
                  isMine
                    ? "ml-auto border-leanme-fuchsia/30 bg-leanme-fuchsia/10"
                    : "border-white/10 bg-black/40"
                }`}
              >
                <p className="text-xs font-semibold text-white/80">
                  {message.authorName}
                  <span className="ml-2 font-normal text-white/40">
                    {formatTime(message.createdAt)}
                  </span>
                </p>
                {message.body ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-white/85">
                    {message.body}
                  </p>
                ) : null}
                {message.mentions?.length ? (
                  <p className="mt-1 text-xs text-leanme-fuchsia">
                    Citati: {message.mentions.join(", ")}
                  </p>
                ) : null}
                {message.links?.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="mt-1 block text-xs text-leanme-fuchsia hover:underline"
                  >
                    ↗ {link.label}
                  </a>
                ))}
                {message.attachments?.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block text-xs text-white/70 hover:text-white"
                  >
                    📎 {attachment.name}
                  </a>
                ))}
              </article>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(event) => void handleSend(event)}
        className="border-t border-white/10 px-4 py-4 sm:px-6"
      >
        <textarea
          rows={3}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Scrivi un messaggio per il team…"
          className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={pending || !body.trim()}
            className="rounded-full bg-leanme-fuchsia px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white disabled:opacity-50"
          >
            {pending ? "Invio…" : "Invia"}
          </button>
          <label className="cursor-pointer rounded-full border border-white/20 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white hover:border-leanme-fuchsia">
            {uploading ? "Upload…" : "Allega"}
            <input
              type="file"
              accept="image/*,application/pdf,text/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleAttachAndSend(file);
                }
                event.target.value = "";
              }}
            />
          </label>
        </div>
        {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
      </form>
    </section>
  );
}
