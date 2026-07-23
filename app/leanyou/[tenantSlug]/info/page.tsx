import { notFound, redirect } from "next/navigation";

import { LeonardoPageHeader } from "@/components/lean-event/LeonardoPageHeader";
import { getBuildInformation } from "@/core/infrastructure/build-info/build-info";
import { findTenantBySlug } from "@/lib/lean-event/auth";
import {
  getDisplayedProductVersion,
  listProductReleases,
} from "@/lib/lean-event/releases";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanEventLeonardoInfoPath,
  leanEventLoginPath,
} from "@/lib/lean-event/paths";
import { getSession } from "@/lib/lean-event/session";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

function formatPublishedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("it-IT", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug } = await params;
  return createPageMetadata({
    title: "Lean Event · Info",
    description: "Versione software e aggiornamenti LeanEvent.",
    path: leanEventLeonardoInfoPath(tenantSlug),
    noIndex: true,
  });
}

export default async function LeonardoInfoPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const tenant = await findTenantBySlug(tenantSlug);
  if (!tenant) {
    notFound();
  }

  const session = await getSession();
  if (!session) {
    redirect(leanEventLoginPath());
  }

  const build = getBuildInformation();
  const version = await getDisplayedProductVersion();
  const releases = await listProductReleases();

  return (
    <div className="space-y-6">
      <LeonardoPageHeader
        title="Info"
        subtitle="Versione della piattaforma online e storico breve dei rilasci."
      />

      <section className="rounded-xl border border-leanme-fuchsia/30 bg-leanme-fuchsia/10 px-5 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-leanme-fuchsia">
          Versione corrente online
        </p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
          {build.productName} {version}
        </p>
        <dl className="mt-4 grid gap-2 text-sm text-white/65 sm:grid-cols-2">
          <div>
            <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">
              Architettura
            </dt>
            <dd className="text-white/85">v{build.architectureVersion}</dd>
          </div>
          {build.releaseName ? (
            <div>
              <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                Release
              </dt>
              <dd className="text-white/85">{build.releaseName}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">
              Ambiente
            </dt>
            <dd className="text-white/85">{build.environment}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">
              Persistenza
            </dt>
            <dd className="text-white/85">PostgreSQL / Neon (SoT)</dd>
          </div>
          {build.gitCommit ? (
            <div>
              <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                Commit
              </dt>
              <dd className="font-mono text-xs text-white/85">
                {build.gitCommit.slice(0, 10)}
              </dd>
            </div>
          ) : null}
          {build.buildTime ? (
            <div>
              <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                Build
              </dt>
              <dd className="text-white/85">{build.buildTime}</dd>
            </div>
          ) : null}
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-white/45">
          Ogni nuovo rilascio viene annunciato anche dalla campanella Notifiche.
          Qui trovi la versione corrente e un riassunto tecnico di ciascuna
          release.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
          Aggiornamenti
        </h2>
        {releases.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-[#111111] px-5 py-6 text-sm text-white/50">
            Nessun aggiornamento pubblicato ancora.
          </p>
        ) : (
          <ul className="space-y-3">
            {releases.map((release) => (
              <li
                key={release.version}
                className="rounded-xl border border-white/10 bg-[#111111] p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-bold text-white">
                    <span className="text-leanme-fuchsia">
                      v{release.version}
                    </span>
                    {" · "}
                    {release.title}
                  </p>
                  <time
                    dateTime={release.publishedAt}
                    className="text-[11px] text-white/40"
                  >
                    {formatPublishedAt(release.publishedAt)}
                  </time>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  {release.summary}
                </p>
                {release.changesFromPrevious ? (
                  <div className="mt-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
                      Rispetto alla precedente
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-white/70">
                      {release.changesFromPrevious}
                    </p>
                  </div>
                ) : null}
                {release.highlights.length > 0 ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/75">
                    {release.highlights.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
                {release.technicalRefs.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
                      Riferimenti tecnici
                    </p>
                    <ul className="mt-1.5 space-y-1 font-mono text-[11px] leading-relaxed text-white/55">
                      {release.technicalRefs.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {release.architectureVersion ? (
                  <p className="mt-3 text-[11px] text-white/35">
                    Architettura di riferimento: v{release.architectureVersion}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
