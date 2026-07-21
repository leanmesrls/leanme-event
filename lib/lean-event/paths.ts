export function leanEventRoot(): string {
  return "/lean-event";
}

/** Login unificato — entry LeanEvent. */
export function leanEventLoginPath(): string {
  return "/lean-event";
}

export function leanEventTenantBase(tenantSlug: string): string {
  return `/lean-event/${tenantSlug}`;
}

/** @deprecated Usa leanEventLoginPath — login unificato. */
export function leanEventTenantLoginPath(tenantSlug: string): string {
  return `${leanEventTenantBase(tenantSlug)}/login`;
}

/**
 * Hub area riservata tenant (ex …/leonardo).
 * Nome funzione storico: resta per non rompere i call site.
 */
export function leanEventLeonardoPath(tenantSlug: string): string {
  return leanEventTenantBase(tenantSlug);
}

export function leanEventLeonardoVerbaliPath(tenantSlug: string): string {
  return `${leanEventLeonardoPath(tenantSlug)}/verbali`;
}

export function leanEventLeonardoNewPath(tenantSlug: string): string {
  return `${leanEventLeonardoVerbaliPath(tenantSlug)}/new`;
}

export function leanEventLeonardoWorkspacePath(
  tenantSlug: string,
  workspaceId: string
): string {
  return `${leanEventLeonardoVerbaliPath(tenantSlug)}/${workspaceId}`;
}

export function leanEventLeonardoEventiPath(tenantSlug: string): string {
  return `${leanEventLeonardoPath(tenantSlug)}/eventi`;
}

export function leanEventLeonardoCestinoPath(tenantSlug: string): string {
  return `${leanEventLeonardoPath(tenantSlug)}/cestino`;
}

export function leanEventLeonardoDocumentiPath(tenantSlug: string): string {
  return `${leanEventLeonardoPath(tenantSlug)}/documenti`;
}

export function leanEventLeonardoProfiloPath(tenantSlug: string): string {
  return `${leanEventLeonardoPath(tenantSlug)}/profilo`;
}

export function leanEventLeonardoEventNewPath(tenantSlug: string): string {
  return `${leanEventLeonardoEventiPath(tenantSlug)}/new`;
}

export function leanEventLeonardoEventPath(
  tenantSlug: string,
  eventId: string
): string {
  return `${leanEventLeonardoEventiPath(tenantSlug)}/${eventId}`;
}

export function leanEventLeonardoContattiPath(tenantSlug: string): string {
  return `${leanEventLeonardoPath(tenantSlug)}/contatti`;
}

export function leanEventLeonardoContactPath(
  tenantSlug: string,
  contactId: string
): string {
  return `${leanEventLeonardoContattiPath(tenantSlug)}/${contactId}`;
}

export function leanEventLeonardoSediPath(tenantSlug: string): string {
  return `${leanEventLeonardoPath(tenantSlug)}/sedi`;
}

export function leanEventLeonardoFornitoriPath(tenantSlug: string): string {
  return `${leanEventLeonardoPath(tenantSlug)}/fornitori`;
}

export function leanEventLeonardoSupplierPath(
  tenantSlug: string,
  supplierId: string
): string {
  return `${leanEventLeonardoFornitoriPath(tenantSlug)}/${supplierId}`;
}

/** Deep link rubrica fornitori — apre scheda in popup (`?fornitore=`). */
export function leanEventLeonardoSupplierSheetPath(
  tenantSlug: string,
  supplierId: string
): string {
  return `${leanEventLeonardoFornitoriPath(tenantSlug)}?fornitore=${encodeURIComponent(supplierId)}`;
}

/** Deep link rubrica contatti — apre scheda in popup (`?contatto=`). */
export function leanEventLeonardoContactSheetPath(
  tenantSlug: string,
  contactId: string
): string {
  return `${leanEventLeonardoContattiPath(tenantSlug)}?contatto=${encodeURIComponent(contactId)}`;
}

/** Deep link rubrica sedi — apre scheda in popup (`?sede=`). */
export function leanEventLeonardoVenueSheetPath(
  tenantSlug: string,
  venueId: string
): string {
  return `${leanEventLeonardoSediPath(tenantSlug)}?sede=${encodeURIComponent(venueId)}`;
}

export function leanEventLeonardoClientiPath(tenantSlug: string): string {
  return `${leanEventLeonardoPath(tenantSlug)}/clienti`;
}

export function leanEventLeonardoVenuePath(
  tenantSlug: string,
  venueId: string
): string {
  return `${leanEventLeonardoSediPath(tenantSlug)}/${venueId}`;
}

export function leanEventLeonardoFinancePath(tenantSlug: string): string {
  return `${leanEventLeonardoPath(tenantSlug)}/finance`;
}

export function leanEventLeonardoSupportoPath(tenantSlug: string): string {
  return leanEventLeonardoLeanStudioPath(tenantSlug);
}

/** @deprecated → lean-studio */
export function leanEventLeonardoLeanHumanPath(tenantSlug: string): string {
  return leanEventLeonardoLeanStudioPath(tenantSlug);
}

export function leanEventLeonardoLeanStudioPath(tenantSlug: string): string {
  return `${leanEventLeonardoPath(tenantSlug)}/lean-studio`;
}

export function leanEventLeonardoAccountPath(tenantSlug: string): string {
  return `${leanEventLeonardoPath(tenantSlug)}/account`;
}

export function leanEventLeonardoNotifichePath(tenantSlug: string): string {
  return `${leanEventLeonardoPath(tenantSlug)}/notifiche`;
}

export function leanEventLeonardoHelpCenterPath(tenantSlug: string): string {
  return `${leanEventLeonardoPath(tenantSlug)}/help-center`;
}

export function leanEventLeonardoFeedbackPath(tenantSlug: string): string {
  return `${leanEventLeonardoPath(tenantSlug)}/feedback`;
}

export function leanEventLeonardoGovernmentPath(tenantSlug: string): string {
  return `${leanEventLeonardoPath(tenantSlug)}/government`;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Segmenti riservati (non sono slug tenant). */
const RESERVED_TENANT_SEGMENTS = new Set([
  "login",
  "leonardo",
  "api",
]);

export function isLeonardoWorkspaceId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function parseTenantSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/lean-event\/([^/]+)(?:\/|$)/);
  if (!match?.[1] || RESERVED_TENANT_SEGMENTS.has(match[1])) {
    return null;
  }
  return match[1];
}

export function isTenantLoginPath(pathname: string): boolean {
  return /^\/lean-event\/[^/]+\/login$/.test(pathname);
}

export function isLegacyLeanEventLeonardoPath(pathname: string): boolean {
  return pathname.startsWith("/lean-event/leonardo");
}

/** Path legacy …/{tenant}/leonardo(/…) → hub senza segmento leonardo. */
export function stripLegacyTenantLeonardoSegment(pathname: string): string | null {
  const match = pathname.match(/^\/lean-event\/([^/]+)\/leonardo(\/.*)?$/);
  if (!match) {
    return null;
  }
  const tenantSlug = match[1];
  const rest = match[2] ?? "";
  if (!rest || rest === "/") {
    return leanEventLeonardoPath(tenantSlug);
  }
  return `${leanEventLeonardoPath(tenantSlug)}${rest}`;
}

export function mapLegacyLeanEventLeonardoPath(
  pathname: string,
  tenantSlug: string
): string | null {
  if (pathname.startsWith("/lean-event/leonardo")) {
    const rest = pathname.slice("/lean-event/leonardo".length);
    if (!rest || rest === "/") {
      return leanEventLeonardoPath(tenantSlug);
    }
    if (rest === "/new") {
      return leanEventLeonardoNewPath(tenantSlug);
    }
    const workspaceId = rest.replace(/^\//, "");
    if (isLeonardoWorkspaceId(workspaceId)) {
      return leanEventLeonardoWorkspacePath(tenantSlug, workspaceId);
    }
    return `${leanEventLeonardoPath(tenantSlug)}${rest}`;
  }

  return null;
}

/** Redirect legacy /leonardo/[uuid] and /leonardo/new */
export function mapLegacyTenantLeonardoChildPath(
  tenantSlug: string,
  segment: string
): string | null {
  if (segment === "new") {
    return leanEventLeonardoNewPath(tenantSlug);
  }
  if (isLeonardoWorkspaceId(segment)) {
    return leanEventLeonardoWorkspacePath(tenantSlug, segment);
  }
  return null;
}
