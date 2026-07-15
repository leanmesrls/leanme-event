export function leanyouRoot(): string {
  return "/leanyou";
}

export function leanyouLoginPath(): string {
  return "/leanyou/login";
}

export function leanyouTenantBase(tenantSlug: string): string {
  return `/leanyou/${tenantSlug}`;
}

export function leanyouTenantLoginPath(tenantSlug: string): string {
  return `${leanyouTenantBase(tenantSlug)}/login`;
}

/** Cruscotto piattaforma Leonardo */
export function leanyouLeonardoPath(tenantSlug: string): string {
  return `${leanyouTenantBase(tenantSlug)}/leonardo`;
}

export function leanyouLeonardoVerbaliPath(tenantSlug: string): string {
  return `${leanyouLeonardoPath(tenantSlug)}/verbali`;
}

export function leanyouLeonardoNewPath(tenantSlug: string): string {
  return `${leanyouLeonardoVerbaliPath(tenantSlug)}/new`;
}

export function leanyouLeonardoWorkspacePath(
  tenantSlug: string,
  workspaceId: string
): string {
  return `${leanyouLeonardoVerbaliPath(tenantSlug)}/${workspaceId}`;
}

export function leanyouLeonardoEventiPath(tenantSlug: string): string {
  return `${leanyouLeonardoPath(tenantSlug)}/eventi`;
}

export function leanyouLeonardoCestinoPath(tenantSlug: string): string {
  return `${leanyouLeonardoPath(tenantSlug)}/cestino`;
}

export function leanyouLeonardoProfiloPath(tenantSlug: string): string {
  return `${leanyouLeonardoPath(tenantSlug)}/profilo`;
}

export function leanyouLeonardoEventNewPath(tenantSlug: string): string {
  return `${leanyouLeonardoEventiPath(tenantSlug)}/new`;
}

export function leanyouLeonardoEventPath(
  tenantSlug: string,
  eventId: string
): string {
  return `${leanyouLeonardoEventiPath(tenantSlug)}/${eventId}`;
}

export function leanyouLeonardoContattiPath(tenantSlug: string): string {
  return `${leanyouLeonardoPath(tenantSlug)}/contatti`;
}

export function leanyouLeonardoContactPath(
  tenantSlug: string,
  contactId: string
): string {
  return `${leanyouLeonardoContattiPath(tenantSlug)}/${contactId}`;
}

export function leanyouLeonardoSediPath(tenantSlug: string): string {
  return `${leanyouLeonardoPath(tenantSlug)}/sedi`;
}

export function leanyouLeonardoFornitoriPath(tenantSlug: string): string {
  return `${leanyouLeonardoPath(tenantSlug)}/fornitori`;
}

export function leanyouLeonardoSupplierPath(
  tenantSlug: string,
  supplierId: string
): string {
  return `${leanyouLeonardoFornitoriPath(tenantSlug)}/${supplierId}`;
}

/** Deep link rubrica fornitori — apre scheda in popup (`?fornitore=`). */
export function leanyouLeonardoSupplierSheetPath(
  tenantSlug: string,
  supplierId: string
): string {
  return `${leanyouLeonardoFornitoriPath(tenantSlug)}?fornitore=${encodeURIComponent(supplierId)}`;
}

/** Deep link rubrica contatti — apre scheda in popup (`?contatto=`). */
export function leanyouLeonardoContactSheetPath(
  tenantSlug: string,
  contactId: string
): string {
  return `${leanyouLeonardoContattiPath(tenantSlug)}?contatto=${encodeURIComponent(contactId)}`;
}

/** Deep link rubrica sedi — apre scheda in popup (`?sede=`). */
export function leanyouLeonardoVenueSheetPath(
  tenantSlug: string,
  venueId: string
): string {
  return `${leanyouLeonardoSediPath(tenantSlug)}?sede=${encodeURIComponent(venueId)}`;
}

export function leanyouLeonardoClientiPath(tenantSlug: string): string {
  return `${leanyouLeonardoPath(tenantSlug)}/clienti`;
}

export function leanyouLeonardoVenuePath(
  tenantSlug: string,
  venueId: string
): string {
  return `${leanyouLeonardoSediPath(tenantSlug)}/${venueId}`;
}

export function leanyouLeonardoFinancePath(tenantSlug: string): string {
  return `${leanyouLeonardoPath(tenantSlug)}/finance`;
}

export function leanyouLeonardoSupportoPath(tenantSlug: string): string {
  return leanyouLeonardoLeanHumanPath(tenantSlug);
}

export function leanyouLeonardoLeanHumanPath(tenantSlug: string): string {
  return `${leanyouLeonardoPath(tenantSlug)}/lean-human`;
}

export function leanyouLeonardoGovernmentPath(tenantSlug: string): string {
  return `${leanyouLeonardoPath(tenantSlug)}/government`;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLeonardoWorkspaceId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function parseTenantSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/leanyou\/([^/]+)(?:\/|$)/);
  if (!match?.[1] || match[1] === "login") {
    return null;
  }
  return match[1];
}

export function isTenantLoginPath(pathname: string): boolean {
  return /^\/leanyou\/[^/]+\/login$/.test(pathname);
}

export function isLegacyLeanYouLeonardoPath(pathname: string): boolean {
  return pathname.startsWith("/leanyou/leonardo");
}

export function mapLegacyLeanYouLeonardoPath(
  pathname: string,
  tenantSlug: string
): string | null {
  if (pathname.startsWith("/leanyou/leonardo")) {
    const rest = pathname.slice("/leanyou/leonardo".length);
    if (!rest || rest === "/") {
      return leanyouLeonardoPath(tenantSlug);
    }
    if (rest === "/new") {
      return leanyouLeonardoNewPath(tenantSlug);
    }
    const workspaceId = rest.replace(/^\//, "");
    if (isLeonardoWorkspaceId(workspaceId)) {
      return leanyouLeonardoWorkspacePath(tenantSlug, workspaceId);
    }
    return `/leanyou/${tenantSlug}/leonardo${rest}`;
  }

  if (pathname === "/leanyou") {
    return leanyouLeonardoPath(tenantSlug);
  }

  return null;
}

/** Redirect legacy /leonardo/[uuid] and /leonardo/new */
export function mapLegacyTenantLeonardoChildPath(
  tenantSlug: string,
  segment: string
): string | null {
  if (segment === "new") {
    return leanyouLeonardoNewPath(tenantSlug);
  }
  if (isLeonardoWorkspaceId(segment)) {
    return leanyouLeonardoWorkspacePath(tenantSlug, segment);
  }
  return null;
}
