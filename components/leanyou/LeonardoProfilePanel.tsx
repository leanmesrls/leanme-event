"use client";

import { LEONARDO_PAGE_TITLE } from "@/components/leanyou/leonardo-ui";
import type { LeanYouSession } from "@/types/leanyou";

interface LeonardoProfilePanelProps {
  session: LeanYouSession;
}

export function LeonardoProfilePanel({ session }: LeonardoProfilePanelProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h2 className={LEONARDO_PAGE_TITLE}>Profilo</h2>
        <p className="mt-2 text-sm text-white/60">
          Personalizza i dati del tuo account LeanYou: foto, password e
          preferenze.
        </p>
      </div>

      <section className="rounded-xl border border-white/10 bg-[#111111] p-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-white/70">
          Account
        </h3>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-white/45">Nome</dt>
            <dd className="mt-0.5 text-white">{session.userName}</dd>
          </div>
          <div>
            <dt className="text-white/45">Email</dt>
            <dd className="mt-0.5 text-white">{session.userEmail}</dd>
          </div>
          <div>
            <dt className="text-white/45">Organizzazione</dt>
            <dd className="mt-0.5 text-white">{session.tenantName}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3">
        {[
          {
            title: "Foto profilo",
            description: "Carica o aggiorna l'immagine del tuo profilo.",
          },
          {
            title: "Password",
            description: "Modifica la password di accesso in sicurezza.",
          },
          {
            title: "Preferenze",
            description: "Notifiche, lingua e impostazioni personali.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-dashed border-white/15 px-5 py-4"
          >
            <p className="font-medium text-white">{item.title}</p>
            <p className="mt-1 text-sm text-white/50">{item.description}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.08em] text-leanme-fuchsia/80">
              In arrivo
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
