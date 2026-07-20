import type {
  LeanEventTenantUserPublic,
  LeonardoEvent,
  LeonardoVenue,
} from "@/types/lean-event";

export function formatTenantUserLabel(user: LeanEventTenantUserPublic): string {
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  return fullName || user.name || user.email;
}

export function sanitizeEventProjectTeam(
  tenantUsers: LeanEventTenantUserPublic[],
  input: {
    projectLeaderUserId?: string | null;
    projectManagerUserIds?: string[] | null;
  }
): {
  projectLeaderUserId: string | null;
  projectManagerUserIds: string[];
} {
  const validIds = new Set(tenantUsers.map((user) => user.id));
  const leader =
    input.projectLeaderUserId && validIds.has(input.projectLeaderUserId)
      ? input.projectLeaderUserId
      : null;
  const managers = (input.projectManagerUserIds ?? []).filter(
    (userId) => validIds.has(userId) && userId !== leader
  );
  return {
    projectLeaderUserId: leader,
    projectManagerUserIds: [...new Set(managers)],
  };
}

export function formatEventProjectRif(
  event: Pick<LeonardoEvent, "projectLeaderUserId" | "projectManagerUserIds">,
  tenantUsers: LeanEventTenantUserPublic[]
): string {
  const byId = new Map(tenantUsers.map((user) => [user.id, user]));
  const parts: string[] = [];

  if (event.projectLeaderUserId) {
    const leader = byId.get(event.projectLeaderUserId);
    if (leader) {
      parts.push(`PL: ${formatTenantUserLabel(leader)}`);
    }
  }

  const managers = (event.projectManagerUserIds ?? [])
    .map((userId) => byId.get(userId))
    .filter((user): user is LeanEventTenantUserPublic => Boolean(user))
    .map((user) => formatTenantUserLabel(user));

  if (managers.length > 0) {
    parts.push(`PM: ${managers.join(", ")}`);
  }

  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function resolveEventVenueCity(
  event: Pick<LeonardoEvent, "venueId" | "venue">,
  venues: LeonardoVenue[]
): string {
  if (event.venueId) {
    const venue = venues.find((item) => item.id === event.venueId);
    if (venue?.city?.trim()) {
      return venue.city.trim();
    }
  }
  return "—";
}

/** Ordina utenze tenant per etichetta visibile. */
export function sortTenantUsers(
  users: LeanEventTenantUserPublic[]
): LeanEventTenantUserPublic[] {
  return [...users].sort((a, b) =>
    formatTenantUserLabel(a).localeCompare(formatTenantUserLabel(b), "it")
  );
}

export function tenantUserMatchesQuery(
  user: LeanEventTenantUserPublic,
  query: string
): boolean {
  const haystack = [formatTenantUserLabel(user), user.email, user.name]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}
