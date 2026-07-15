import type { LeonardoWorkspace } from "@/types/leanyou";

import { normalizeAudioForOpenAI } from "./audio-upload";
import { cleanFullTranscript } from "./transcription-cleanup";
import { compactStructuredKeywords } from "./keyword-compaction";
import { renderLeonardoDocuments } from "./document-renderer";
import { getLeanYouPrompts } from "./storage";
import { buildMultipartBody } from "./openai-multipart";

const OPENAI_DIRECT_LIMIT = 24 * 1024 * 1024;
const MIN_AUDIO_BYTES = 512;

function getOpenAiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY non configurata. Imposta la chiave in .env.local per elaborare verbali."
    );
  }
  return key;
}

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
  const model = process.env.OPENAI_TRANSCRIPTION_MODEL ?? "whisper-1";
  const multipart = buildMultipartBody(
    {
      model,
      language: "it",
    },
    {
      fieldName: "file",
      filename: audio.filename,
      mimeType: audio.mimeType,
      buffer: audio.buffer,
    }
  );

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenAiKey()}`,
      "Content-Type": multipart.contentType,
      "Content-Length": String(multipart.body.byteLength),
    },
    body: new Uint8Array(multipart.body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Trascrizione OpenAI fallita: ${errorText}`);
  }

  const payload = (await response.json()) as { text?: string };
  return payload.text?.trim() ?? "";
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
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenAiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_STRUCTURING_MODEL ?? "gpt-4.1-mini",
      response_format: { type: "json_object" },
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
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Strutturazione OpenAI fallita: ${errorText}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI non ha restituito JSON strutturato.");
  }

  return JSON.parse(content) as Record<string, unknown>;
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
    getLeanYouPrompts();
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
