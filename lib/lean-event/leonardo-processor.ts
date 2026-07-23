import type { LeonardoWorkspace } from "@/types/lean-event";

import { getConfiguredAiGateway } from "@/modules/ai/gateway/get-configured-gateway";

import { normalizeAudioForOpenAI } from "./audio-upload";
import { cleanFullTranscript } from "./transcription-cleanup";
import { compactStructuredKeywords } from "./keyword-compaction";
import { renderLeonardoDocuments } from "./document-renderer";
import { getLeanEventPrompts } from "./storage";

const OPENAI_DIRECT_LIMIT = 24 * 1024 * 1024;
const MIN_AUDIO_BYTES = 512;

export async function transcribeAudioBuffer(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  if (buffer.byteLength > OPENAI_DIRECT_LIMIT) {
    throw new Error(
      "Parte audio troppo grande (max 24 MB per segmento). Il video verrà suddiviso automaticamente."
    );
  }

  if (buffer.byteLength < MIN_AUDIO_BYTES) {
    throw new Error(
      "File audio vuoto o corrotto. Verifica che il video contenga una traccia audio."
    );
  }

  const audio = normalizeAudioForOpenAI(buffer, filename, mimeType);
  const gateway = getConfiguredAiGateway("openai");
  const text = await gateway.transcribeAudio({
    bytes: audio.buffer,
    filename: audio.filename,
    mimeType: audio.mimeType,
    language: "it",
  });
  return text.trim();
}

function segmentContent(content: string, maxChars = 9000): string[] {
  const trimmed = content.trim();
  if (!trimmed) {
    return [];
  }
  if (trimmed.length <= maxChars) {
    return [trimmed];
  }

  const paragraphs = trimmed.split(/\n{2,}/);
  const segments: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxChars && current) {
      segments.push(current);
      current = paragraph;
    } else {
      current = candidate;
    }
  }

  if (current) {
    segments.push(current);
  }

  return segments;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await fn(items[index]!, index);
    }
  }

  const workers = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

function mergeStructuredPartials(partials: Record<string, unknown>[]): Record<string, unknown> {
  const merged: Record<string, unknown> = {
    meeting: {},
    partecipanti: [],
    agenda: [],
    summary: "",
    executive_summary: "",
    topics: [],
    decisioni: [],
    attivita: [],
    responsabili: [],
    scadenze: [],
    domande_aperte: [],
    rischi: [],
    keyword: [],
    outputs: {},
  };

  for (const partial of partials) {
    for (const [key, value] of Object.entries(partial)) {
      if (Array.isArray(value)) {
        const existing = (merged[key] as unknown[]) ?? [];
        merged[key] = [...existing, ...value];
      } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        merged[key] = {
          ...((merged[key] as Record<string, unknown>) ?? {}),
          ...(value as Record<string, unknown>),
        };
      } else if (typeof value === "string" && value.trim()) {
        merged[key] = value;
      }
    }
  }

  return merged;
}

async function structureSegment(
  systemPrompt: string,
  schemaInstructions: string,
  workspaceContext: string,
  segment: string,
  index: number,
  total: number
): Promise<Record<string, unknown>> {
  const gateway = getConfiguredAiGateway("openai");
  return gateway.completeJson<Record<string, unknown>>({
    model: process.env.OPENAI_STRUCTURING_MODEL ?? "gpt-4.1-mini",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: `${systemPrompt}\n\n${schemaInstructions}`,
      },
      {
        role: "user",
        content: `Contesto workspace:\n${workspaceContext}\n\nAnalizza il segmento ${index}/${total} della riunione e restituisci JSON strutturato.\n\n${segment}`,
      },
    ],
  });
}

export async function processLeonardoWorkspace(input: {
  meetingType: string;
  workspaceContext: string;
  transcript: string;
  workspace: Pick<
    LeonardoWorkspace,
    "title" | "meetingDate" | "participants" | "client" | "organization"
  >;
}): Promise<{ structured: Record<string, unknown>; documents: Record<string, string> }> {
  const { templates, schemaInstructions, documentGuidelines, emailFollowupInstructions } =
    getLeanEventPrompts();
  const template =
    templates.find((entry) => entry.slug === input.meetingType) ??
    templates[0];

  const promptExtras = [documentGuidelines, emailFollowupInstructions]
    .filter(Boolean)
    .join("\n\n");
  const fullSchemaInstructions = promptExtras
    ? `${schemaInstructions}\n\n${promptExtras}`
    : schemaInstructions;

  const transcript = cleanFullTranscript(input.transcript);
  const segments = segmentContent(transcript);
  if (segments.length === 0) {
    throw new Error("Trascrizione vuota: carica un file o incolla il testo.");
  }

  const partials = await mapWithConcurrency(
    segments,
    3,
    (segment, index) =>
      structureSegment(
        template.systemPrompt,
        fullSchemaInstructions,
        input.workspaceContext,
        segment,
        index + 1,
        segments.length
      )
  );

  const structured = mergeStructuredPartials(partials);
  const compacted = compactStructuredKeywords(structured);
  const outputs = (compacted.outputs as Record<string, unknown>) ?? {};
  compacted.outputs = {
    ...outputs,
    trascrizione_integrale: {
      ...((outputs.trascrizione_integrale as Record<string, unknown>) ?? {}),
      content: transcript,
    },
  };

  return {
    structured: compacted,
    documents: renderLeonardoDocuments(compacted, input.workspace, transcript),
  };
}
