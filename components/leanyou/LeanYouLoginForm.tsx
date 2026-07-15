"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { leanyouLeonardoPath } from "@/lib/leanyou/paths";
import type { LeanYouSession } from "@/types/leanyou";

function resolvePostLoginPath(
  session: LeanYouSession,
  nextPath: string | null
): string {
  if (nextPath?.startsWith(`/leanyou/${session.tenantSlug}/`)) {
    return nextPath;
  }
  return leanyouLeonardoPath(session.tenantSlug);
}

export function LeanYouLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/leanyou/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      let payload: { error?: string; session?: LeanYouSession } = {};
      try {
        payload = (await response.json()) as typeof payload;
      } catch {
        setError("Risposta non valida dal server. Riprova tra qualche secondo.");
        return;
      }

      if (!response.ok || !payload.session) {
        setError(payload.error ?? "Accesso non riuscito.");
        return;
      }

      router.replace(
        resolvePostLoginPath(payload.session, searchParams.get("next"))
      );
      router.refresh();
    } catch {
      setError("Connessione al server non riuscita. Controlla la rete e riprova.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-leanme-fuchsia"
        />
      </div>

      <div>
        <label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-leanme-fuchsia"
        />
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-leanme-fuchsia px-6 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-leanme-fuchsia-dark disabled:opacity-60"
      >
        {loading ? "Accesso in corso..." : "Accedi a LeanYou"}
      </button>
    </form>
  );
}
