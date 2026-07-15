const LIMITS = {
  keywords: 10,
  topics: 6,
  people: 8,
  companies: 6,
  software: 4,
  projects: 5,
  recurring_themes: 5,
  root: 12,
} as const;

const STOPWORDS = new Set([
  "con",
  "per",
  "del",
  "della",
  "dei",
  "delle",
  "di",
  "da",
  "in",
  "su",
  "la",
  "le",
  "il",
  "lo",
  "gli",
  "un",
  "una",
  "e",
  "ed",
]);

export function normalizeKeywordKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ");
}

function toDisplayLabel(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return "";
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function extractLabel(item: unknown): string {
  if (typeof item === "string") {
    return item.trim();
  }
  if (item && typeof item === "object") {
    return String(
      (item as Record<string, unknown>).title ??
        (item as Record<string, unknown>).name ??
        ""
    ).trim();
  }
  return "";
}

function isPrefixVariant(shorter: string, longer: string): boolean {
  if (shorter.length < 4 || longer.length <= shorter.length) {
    return false;
  }

  return longer.startsWith(`${shorter} `) || longer === shorter;
}

function isNearDuplicate(a: string, b: string): boolean {
  if (a === b) {
    return true;
  }

  if (isPrefixVariant(a, b) || isPrefixVariant(b, a)) {
    return true;
  }

  const wordsA = a.split(" ").filter(Boolean);
  const wordsB = b.split(" ").filter(Boolean);
  if (wordsA.length >= 2 && wordsB.length >= 2 && wordsA[0] === wordsB[0]) {
    const significantA = wordsA.filter((word) => !STOPWORDS.has(word));
    const significantB = wordsB.filter((word) => !STOPWORDS.has(word));
    if (
      significantA.length > 0 &&
      significantB.length > 0 &&
      significantA[0] === significantB[0] &&
      Math.abs(significantA.length - significantB.length) <= 2
    ) {
      return true;
    }
  }

  return false;
}

export function compactKeywordLabels(labels: string[], max: number): string[] {
  const candidates = labels
    .map((label) => ({
      key: normalizeKeywordKey(label),
      label: toDisplayLabel(label),
    }))
    .filter((entry) => entry.key.length >= 3 && entry.label);

  candidates.sort((a, b) => a.key.length - b.key.length);

  const kept: Array<{ key: string; label: string }> = [];

  for (const candidate of candidates) {
    const duplicateIndex = kept.findIndex((entry) =>
      isNearDuplicate(entry.key, candidate.key)
    );

    if (duplicateIndex >= 0) {
      const existing = kept[duplicateIndex]!;
      if (candidate.key.length < existing.key.length) {
        kept[duplicateIndex] = candidate;
      }
      continue;
    }

    kept.push(candidate);
    if (kept.length >= max) {
      break;
    }
  }

  return kept.map((entry) => entry.label);
}

function compactGroup(items: unknown[], max: number): string[] {
  return compactKeywordLabels(
    items.map(extractLabel).filter(Boolean),
    max
  );
}

export function compactStructuredKeywords(
  structured: Record<string, unknown>
): Record<string, unknown> {
  const outputs = (structured.outputs as Record<string, unknown>) ?? {};
  const keywordsTopics =
    (outputs.keywords_topics as Record<string, unknown>) ?? {};

  const mergedKeywords = compactKeywordLabels(
    [
      ...((structured.keyword as unknown[]) ?? []).map(extractLabel),
      ...((keywordsTopics.keywords as unknown[]) ?? []).map(extractLabel),
    ].filter(Boolean),
    LIMITS.keywords
  );

  const compactedTopics = compactGroup(
    Array.isArray(keywordsTopics.topics) ? keywordsTopics.topics : [],
    LIMITS.topics
  );
  const compactedKeywordsTopics = {
    ...keywordsTopics,
    keywords: mergedKeywords,
    topics: compactedTopics,
    people: compactGroup(
      Array.isArray(keywordsTopics.people) ? keywordsTopics.people : [],
      LIMITS.people
    ),
    companies: compactGroup(
      Array.isArray(keywordsTopics.companies) ? keywordsTopics.companies : [],
      LIMITS.companies
    ),
    software: compactGroup(
      Array.isArray(keywordsTopics.software) ? keywordsTopics.software : [],
      LIMITS.software
    ),
    projects: compactGroup(
      Array.isArray(keywordsTopics.projects) ? keywordsTopics.projects : [],
      LIMITS.projects
    ),
    recurring_themes: compactGroup(
      Array.isArray(keywordsTopics.recurring_themes)
        ? keywordsTopics.recurring_themes
        : [],
      LIMITS.recurring_themes
    ),
  };

  return {
    ...structured,
    keyword: compactKeywordLabels(
      [
        ...mergedKeywords,
        ...compactedTopics,
        ...((compactedKeywordsTopics.people as string[]) ?? []),
      ],
      LIMITS.root
    ),
    outputs: {
      ...outputs,
      keywords_topics: compactedKeywordsTopics,
    },
  };
}

export function getCompactSearchKeywords(
  structured: Record<string, unknown> | null
): string[] {
  if (!structured) {
    return [];
  }

  const compacted = compactStructuredKeywords(structured);
  const outputs = (compacted.outputs as Record<string, unknown>) ?? {};
  const keywordsTopics =
    (outputs.keywords_topics as Record<string, unknown>) ?? {};

  return compactKeywordLabels(
    [
      ...((compacted.keyword as unknown[]) ?? []).map(extractLabel),
      ...((keywordsTopics.keywords as unknown[]) ?? []).map(extractLabel),
      ...((keywordsTopics.topics as unknown[]) ?? []).map(extractLabel),
      ...((keywordsTopics.recurring_themes as unknown[]) ?? []).map(extractLabel),
    ].filter(Boolean),
    LIMITS.root
  );
}
