export function mergeTranscriptParts(parts: string[]): string {
  return parts
    .map((text) => text.trim())
    .filter(Boolean)
    .join("\n\n");
}
