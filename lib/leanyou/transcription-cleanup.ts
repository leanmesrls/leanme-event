const HALLUCINATION_PATTERNS = [
  /(?:sottotitoli creati dalla comunità amara\.org[\s.,]*)+/gi,
  /(?:subtitles by the amara\.org community[\s.,]*)+/gi,
  /(?:grazie per aver guardato[\s.,]*)+/gi,
  /(?:thanks for watching[\s.,]*)+/gi,
  /(?:iscriviti al canale[\s.,]*)+/gi,
  /(?:subscribe to the channel[\s.,]*)+/gi,
];

export function countMeaningfulChars(text: string): number {
  return text.replace(/[^\p{L}\p{N}]/gu, "").trim().length;
}

export function hasMinimumTranscriptContent(text: string, min = 12): boolean {
  return countMeaningfulChars(text) >= min;
}

export function cleanTranscriptionPart(text: string): string {
  let cleaned = text.trim();

  for (const pattern of HALLUCINATION_PATTERNS) {
    cleaned = cleaned.replace(pattern, " ").trim();
  }

  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();

  if (!cleaned) {
    return "";
  }

  if (!hasMinimumTranscriptContent(cleaned)) {
    return "";
  }

  return cleaned;
}

export function cleanFullTranscript(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((section) => {
      const withoutPartHeader = section.replace(/^#{1,3}\s*Parte\s+\d+\/\d+\s*\n?/i, "");
      return cleanTranscriptionPart(withoutPartHeader);
    })
    .filter(Boolean)
    .join("\n\n");
}

export function combineTranscriptSources(
  videoTranscript: string,
  supplementalText: string
): string {
  const cleanedVideo = cleanFullTranscript(videoTranscript);
  const cleanedSupplement = cleanFullTranscript(supplementalText);

  if (cleanedVideo && cleanedSupplement) {
    return `${cleanedVideo}\n\n---\n\nInformazioni testuali aggiuntive:\n\n${cleanedSupplement}`;
  }

  if (cleanedVideo) {
    return cleanedVideo;
  }

  return cleanedSupplement;
}

export const MIN_TRANSCRIPT_MEANINGFUL_CHARS = 12;

export function transcriptValidationMessage(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return "Carica un video/audio o aggiungi informazioni testuali.";
  }

  const cleaned = cleanFullTranscript(trimmed);
  if (!cleaned) {
    return `La trascrizione è troppo breve o non contiene testo utilizzabile (servono almeno ${MIN_TRANSCRIPT_MEANINGFUL_CHARS} caratteri significativi).`;
  }

  return null;
}

/** Elaborazione interrotta (timeout/chiusura tab): consente un nuovo tentativo. */
export function isStaleLeonardoProcessing(
  workspace: { status: string; updatedAt: string },
  staleAfterMs = 3 * 60 * 1000
): boolean {
  if (workspace.status !== "processing") {
    return false;
  }

  return Date.now() - new Date(workspace.updatedAt).getTime() > staleAfterMs;
}
