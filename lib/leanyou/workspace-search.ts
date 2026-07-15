import type { LeonardoWorkspace } from "@/types/leanyou";

import { getCompactSearchKeywords, normalizeKeywordKey } from "./keyword-compaction";

function normalize(value: string): string {
  return normalizeKeywordKey(value);
}

export function getWorkspaceKeywords(workspace: LeonardoWorkspace): string[] {
  return getCompactSearchKeywords(workspace.structured);
}

export function getWorkspaceSearchLabels(workspace: LeonardoWorkspace): string[] {
  const manualTags = workspace.tags.map((tag) => tag.trim()).filter(Boolean);
  const aiKeywords = getWorkspaceKeywords(workspace);
  const merged = [...manualTags];

  for (const keyword of aiKeywords) {
    const key = normalize(keyword);
    if (
      !merged.some(
        (existing) => normalize(existing) === key || normalize(existing).includes(key)
      )
    ) {
      merged.push(keyword);
    }
  }

  return merged.slice(0, 20);
}

export function collectFilterLabels(workspaces: LeonardoWorkspace[]): string[] {
  const labels = new Set<string>();
  for (const workspace of workspaces) {
    for (const label of getWorkspaceSearchLabels(workspace)) {
      labels.add(label);
    }
  }
  return [...labels].sort((a, b) => a.localeCompare(b, "it"));
}

export function workspaceMatchesFilters(
  workspace: LeonardoWorkspace,
  query: string,
  tagFilter: string
): boolean {
  const normalizedQuery = normalize(query);
  const normalizedTag = normalize(tagFilter);

  if (normalizedTag) {
    const labels = getWorkspaceSearchLabels(workspace).map(normalize);
    if (!labels.includes(normalizedTag)) {
      return false;
    }
  }

  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    workspace.title,
    workspace.client,
    workspace.organization,
    workspace.participants,
    workspace.notes,
    workspace.transcript,
    ...getWorkspaceSearchLabels(workspace),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}
