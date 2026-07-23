export interface LeanEventAiTranscriptionInput {
  bytes: ArrayBuffer | Buffer;
  filename: string;
  mimeType: string;
  language?: string;
}

export interface LeanEventAiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LeanEventAiChatInput {
  messages: LeanEventAiChatMessage[];
  model?: string;
  temperature?: number;
  responseFormat?: "text" | "json";
}

export interface LeanEventAiGateway {
  transcribeAudio(input: LeanEventAiTranscriptionInput): Promise<string>;
  completeChat(input: LeanEventAiChatInput): Promise<string>;
  completeJson<T>(input: LeanEventAiChatInput): Promise<T>;
}
