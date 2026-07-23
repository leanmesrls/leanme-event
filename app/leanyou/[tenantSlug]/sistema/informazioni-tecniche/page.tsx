import Link from "next/link";
import { redirect } from "next/navigation";

import { getBuildInformation } from "@/core/infrastructure/build-info/build-info";
import { requireActiveTenantBySlug } from "@/core/infrastructure/tenant-registry/tenant-registry";
import { getSession } from "@/lib/lean-event/session";
import { leanEventLoginPath, leanEventTenantBase } from "@/lib/lean-event/paths";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function BuildInformationPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const session = await getSession();
  if (!session || session.tenantSlug !== tenantSlug) {
    redirect(leanEventLoginPath());
  }

  let tenant = null;
  try {
    tenant = await requireActiveTenantBySlug(tenantSlug);
  } catch {
    tenant = null;
  }

  const info = getBuildInformation(tenant ?? undefined);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 text-sm">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-black/45">
          Sistema
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-black">
          Informazioni tecniche
        </h1>
        <p className="mt-2 text-black/60">
          Carta d&apos;identità della build Lean.Event in esecuzione.
        </p>
      </div>

      <dl className="grid gap-3 rounded-xl border border-black/10 bg-white p-5">
        {[
          ["Prodotto", info.productName],
          ["Versione prodotto", info.productVersion],
          ["Versione architettura", info.architectureVersion],
          ["Release", info.releaseName ?? "—"],
          ["Build", info.buildNumber ?? "—"],
          ["Commit", info.gitCommit ?? "—"],
          ["Build time", info.buildTime ?? "—"],
          ["Deploy time", info.deployTime ?? "—"],
          ["Ambiente", info.environment],
          ["Tenant", info.tenant?.slug ?? tenantSlug],
          ["Schema", info.tenant?.schemaVersion ?? "registry non seedato"],
          ["Migrazioni", info.tenant?.migrationStatus ?? "n/d"],
          ["Database ref", info.tenant?.databaseRefMasked ?? "n/d"],
          ["Storage ref", info.tenant?.storageRefMasked ?? "n/d"],
          ["Pack", info.tenant?.commercialPack ?? "n/d"],
          ["AI provider", info.tenant?.aiProvider ?? "n/d"],
          [
            "Control Plane",
            info.services.controlPlaneConfigured ? "configurato" : "mancante",
          ],
          [
            "Inngest",
            info.services.inngestConfigured ? "configurato" : "mancante",
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-4 border-b border-black/5 pb-2"
          >
            <dt className="text-black/50">{label}</dt>
            <dd className="text-right font-medium text-black">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="space-y-2">
        <p className="font-medium text-black">Documentazione tecnica</p>
        <ul className="list-disc space-y-1 pl-5 text-black/70">
          <li>
            <Link className="underline" href={info.documentation.readme}>
              README
            </Link>
          </li>
          <li>
            <Link
              className="underline"
              href={info.documentation.designPrinciples}
            >
              Design Principles
            </Link>
          </li>
          <li>
            <Link className="underline" href={info.documentation.adr}>
              ADR
            </Link>
          </li>
          <li>
            <Link className="underline" href={info.documentation.mandate}>
              Architecture Mandate
            </Link>
          </li>
        </ul>
      </div>

      <p className="text-xs text-black/45">
        Nessuna credenziale o connection string viene mostrata. Hub:{" "}
        <Link className="underline" href={leanEventTenantBase(tenantSlug)}>
          {leanEventTenantBase(tenantSlug)}
        </Link>
      </p>
    </div>
  );
}
