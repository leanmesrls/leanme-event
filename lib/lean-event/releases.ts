import { getBuildInformation } from "@/core/infrastructure/build-info/build-info";
import { getControlPlaneSql } from "@/core/infrastructure/database/control-plane-client";

export interface LeanEventRelease {
  version: string;
  publishedAt: string;
  title: string;
  summary: string;
  highlights: string[];
  technicalRefs: string[];
  changesFromPrevious: string;
  architectureVersion: string | null;
}

export interface LeanEventReleaseNotification {
  id: string;
  title: string;
  summary: string;
  body: string;
  publishedAt: string;
  priority: "high";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function mapRow(row: Record<string, unknown>): LeanEventRelease {
  const published =
    row.published_at instanceof Date
      ? row.published_at.toISOString()
      : String(row.published_at ?? "");

  return {
    version: String(row.version ?? ""),
    publishedAt: published,
    title: String(row.title ?? ""),
    summary: String(row.summary ?? ""),
    highlights: asStringArray(row.highlights),
    technicalRefs: asStringArray(row.technical_refs),
    changesFromPrevious: String(row.changes_from_previous ?? ""),
    architectureVersion:
      row.architecture_version == null
        ? null
        : String(row.architecture_version),
  };
}

/** Elenco rilasci prodotto (SoT: Control Plane Neon). */
export async function listProductReleases(): Promise<LeanEventRelease[]> {
  try {
    const sql = getControlPlaneSql();
    const rows = await sql`
      SELECT
        version,
        published_at,
        title,
        summary,
        highlights,
        technical_refs,
        changes_from_previous,
        architecture_version
      FROM lean_event_platform_releases
      ORDER BY published_at DESC, version DESC
    `;
    return (rows as Record<string, unknown>[]).map(mapRow);
  } catch (error) {
    console.error(
      "[lean-event/releases] Control Plane unread:",
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

export async function getLatestProductRelease(): Promise<LeanEventRelease | null> {
  const releases = await listProductReleases();
  return releases[0] ?? null;
}

/** Versione mostrata in Info: env/package.json, con fallback all’ultimo rilascio. */
export async function getDisplayedProductVersion(): Promise<string> {
  const build = getBuildInformation();
  if (build.productVersion && build.productVersion !== "0.0.0") {
    return build.productVersion;
  }
  return (await getLatestProductRelease())?.version ?? "0.0.0";
}

/** Testo campanella: user-friendly. Dettagli tecnici restano solo in Info. */
export function releaseToNotification(
  release: LeanEventRelease
): LeanEventReleaseNotification {
  const highlights =
    release.highlights.length > 0
      ? `\n\nNovità:\n${release.highlights.map((item) => `• ${item}`).join("\n")}`
      : "";

  return {
    id: `release-${release.version}`,
    title: release.title,
    summary: release.summary,
    body: `${release.summary}${highlights}\n\nVersione: ${release.version}\nPer i dettagli tecnici: Menu account → Info.`,
    publishedAt: release.publishedAt,
    priority: "high",
  };
}

/** Notifiche derivate dai rilasci (campanella). */
export async function listReleaseNotifications(): Promise<
  LeanEventReleaseNotification[]
> {
  const releases = await listProductReleases();
  return releases.map(releaseToNotification);
}
