const TEXT_EXTENSIONS = /\.(txt|vtt|srt)$/i;
const MEDIA_EXTENSIONS = /\.(mp3|m4a|wav|mp4|webm|mov|mkv|avi)$/i;

/**
 * Vercel Functions: request body max 4.5 MB.
 * Base64 + JSON wrapper → keep raw audio under ~3 MB per request.
 */
export const MAX_API_UPLOAD_BYTES = 3 * 1024 * 1024;

/** @deprecated Use MAX_API_UPLOAD_BYTES — kept as alias for transcribe route. */
export const MAX_CHUNK_BYTES = MAX_API_UPLOAD_BYTES;

/** Limite file sorgente (video Zoom fino a ~2 ore). */
export const MAX_INPUT_BYTES = 2 * 1024 * 1024 * 1024;

export interface LeonardoProcessUploadFile {
  name: string;
  mimeType: string;
  dataBase64: string;
}

export interface LeonardoProcessRequestBody {
  transcript?: string;
  file?: LeonardoProcessUploadFile;
}

export async function buildLeonardoProcessBody(
  transcript: string,
  file: File | null
): Promise<LeonardoProcessRequestBody> {
  const trimmed = transcript.trim();
  const body: LeonardoProcessRequestBody = {};

  if (trimmed) {
    body.transcript = trimmed;
  }

  if (!file) {
    return body;
  }

  if (TEXT_EXTENSIONS.test(file.name)) {
    body.transcript = (await file.text()).trim();
    return body;
  }

  if (!MEDIA_EXTENSIONS.test(file.name)) {
    throw new Error(
      "Formato non supportato. Usa txt/vtt/srt oppure mp3/m4a/wav/mp4/webm/mov."
    );
  }

  if (file.size > MAX_CHUNK_BYTES) {
    throw new Error(
      "File audio troppo grande per l'upload diretto. Usa un video o attendi la preparazione automatica."
    );
  }

  body.file = {
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    dataBase64: await blobToBase64(file),
  };

  return body;
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  return arrayBufferToBase64(buffer);
}

export async function fileToUploadPayload(
  file: File
): Promise<LeonardoProcessUploadFile> {
  return {
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    dataBase64: await blobToBase64(file),
  };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const slice = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...slice);
  }

  return btoa(binary);
}

export function decodeUploadFile(file: LeonardoProcessUploadFile): Buffer {
  return Buffer.from(file.dataBase64, "base64");
}

export function isTextFileName(name: string): boolean {
  return TEXT_EXTENSIONS.test(name);
}

export function isMediaFileName(name: string): boolean {
  return MEDIA_EXTENSIONS.test(name);
}
