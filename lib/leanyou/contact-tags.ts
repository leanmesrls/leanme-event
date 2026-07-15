export function parseTagsRaw(raw: string): string[] {
  if (!raw.trim()) {
    return [];
  }

  return normalizeTagsList(
    raw
      .split(/[,;|/]/)
      .map((tag) => tag.trim())
      .filter(Boolean)
  );
}

export function normalizeTagsList(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const tag of tags) {
    const cleaned = tag.trim().replace(/\s+/g, " ");
    if (!cleaned) {
      continue;
    }
    const key = cleaned.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(cleaned);
  }

  return result;
}

export function formatTagsDisplay(tags: string[] | undefined): string {
  if (!tags?.length) {
    return "";
  }
  return tags.join(", ");
}

export function contactHasTag(contact: { tags?: string[] }, tagFilter: string): boolean {
  const normalized = tagFilter.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return (contact.tags ?? []).some((tag) => tag.toLowerCase() === normalized);
}

export function collectContactTags(contacts: Array<{ tags?: string[] }>): string[] {
  const seen = new Map<string, string>();

  for (const contact of contacts) {
    for (const tag of contact.tags ?? []) {
      const key = tag.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, tag);
      }
    }
  }

  return [...seen.values()].sort((a, b) => a.localeCompare(b, "it"));
}

export function collectContactOrganizations(
  contacts: Array<{ organization?: string }>
): string[] {
  const seen = new Map<string, string>();

  for (const contact of contacts) {
    const value = contact.organization?.trim() ?? "";
    if (!value) {
      continue;
    }
    const key = value.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, value);
    }
  }

  return [...seen.values()].sort((a, b) => a.localeCompare(b, "it"));
}

export function tagsDiffer(existing: string[], incoming: string[]): boolean {
  const a = new Set(existing.map((tag) => tag.toLowerCase()));
  const b = new Set(incoming.map((tag) => tag.toLowerCase()));
  if (a.size !== b.size) {
    return true;
  }
  for (const tag of a) {
    if (!b.has(tag)) {
      return true;
    }
  }
  return false;
}

export function mergeTags(existing: string[], incoming: string[]): string[] {
  return normalizeTagsList([...existing, ...incoming]);
}
