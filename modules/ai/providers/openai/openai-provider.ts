import type {
  LeanEventAiChatInput,
  LeanEventAiGateway,
  LeanEventAiTranscriptionInput,
} from "@/contracts/ai-gateway";

function requireOpenAiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENAI_API_KEY missing (fail-closed)");
  }
  return key;
}

export function createOpenAiProvider(): LeanEventAiGateway {
  return {
    async transcribeAudio(input: LeanEventAiTranscriptionInput) {
      const form = new FormData();
      const blob = new Blob([input.bytes as BlobPart], {
        type: input.mimeType || "application/octet-stream",
      });
      form.append("file", blob, input.filename || "audio.webm");
      form.append("model", "whisper-1");
      if (input.language) {
        form.append("language", input.language);
      }

      const response = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${requireOpenAiKey()}`,
          },
          body: form,
        }
      );

      if (!response.ok) {
        throw new Error(`OpenAI transcription failed: ${await response.text()}`);
      }

      const data = (await response.json()) as { text?: string };
      return data.text ?? "";
    },

    async completeChat(input: LeanEventAiChatInput) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${requireOpenAiKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: input.model || "gpt-4o-mini",
          temperature: input.temperature ?? 0.2,
          messages: input.messages,
          response_format:
            input.responseFormat === "json"
              ? { type: "json_object" }
              : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI chat failed: ${await response.text()}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return data.choices?.[0]?.message?.content ?? "";
    },

    async completeJson<T>(input: LeanEventAiChatInput) {
      const text = await this.completeChat({
        ...input,
        responseFormat: "json",
      });
      return JSON.parse(text) as T;
    },
  };
}
