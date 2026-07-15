import { Suspense } from "react";
import Image from "next/image";

import { LeanYouLoginForm } from "@/components/leanyou/LeanYouLoginForm";
import { LeanYouTokenLogin } from "@/components/leanyou/LeanYouTokenLogin";
import configData from "@/data/leanyou/config.json";
import type { LeanYouConfig } from "@/types/leanyou";

const config = configData as LeanYouConfig;

export function LeanYouLoginPageContent() {
  return (
    <div className="bg-black px-5 py-10 text-white md:px-8 md:py-14">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-leanme-fuchsia">
            LeanYou
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-[0.04em] md:text-5xl">
            Area riservata clienti
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/70">
            Accedi con le credenziali fornite da LeanMe oppure tramite link
            diretto con token personale o aziendale. Dopo l&apos;accesso verrai
            indirizzato all&apos;area dedicata alla tua organizzazione.
          </p>

          <div className="mt-8 flex items-center gap-4 rounded-xl border border-white/10 bg-[#111111] p-5">
            <Image
              src={config.leonardo.logo}
              alt="Lean.Agent Leonardo"
              width={72}
              height={72}
              className="rounded-full border border-white/10"
            />
            <div>
              <p className="text-lg font-bold">Leonardo</p>
              <p className="text-sm text-white/60">
                Secretary Assistant · Powered by Lean.Agent.AI
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-[#111111] p-6 md:p-8">
          <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-leanme-fuchsia">
            Accedi
          </h2>
          <div className="mt-6 space-y-4">
            <Suspense fallback={null}>
              <LeanYouTokenLogin />
              <LeanYouLoginForm />
            </Suspense>
          </div>
        </section>
      </div>
    </div>
  );
}
