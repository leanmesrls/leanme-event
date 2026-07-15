"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { leanEventLeonardoPath } from "@/lib/lean-event/paths";
import type { LeanEventSession } from "@/types/lean-event";

function resolvePostLoginPath(
  session: LeanEventSession,
  nextPath: string | null
): string {
  if (nextPath?.startsWith(`/lean-event/${session.tenantSlug}/`)) {
    return nextPath;
  }
  return leanEventLeonardoPath(session.tenantSlug);
}

export function LeanEventTokenLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Verifica token in corso...");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      return;
    }

    async function loginWithToken() {
      try {
        const response = await fetch("/api/lean-event/auth/login", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        let payload: { error?: string; session?: LeanEventSession } = {};
        try {
          payload = (await response.json()) as typeof payload;
        } catch {
          setMessage("Risposta non valida dal server. Riprova tra qualche secondo.");
          return;
        }

        if (!response.ok || !payload.session) {
          setMessage(payload.error ?? "Token non valido o scaduto.");
          return;
        }

        router.replace(
          resolvePostLoginPath(payload.session, searchParams.get("next"))
        );
        router.refresh();
      } catch {
        setMessage("Connessione al server non riuscita. Controlla la rete e riprova.");
      }
    }

    void loginWithToken();
  }, [router, searchParams]);

  if (!searchParams.get("token")) {
    return null;
  }

  return (
    <p className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
      {message}
    </p>
  );
}
