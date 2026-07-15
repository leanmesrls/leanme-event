"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

import { MAX_API_UPLOAD_BYTES } from "@/lib/lean-event/upload-payload";

export const MAX_INPUT_BYTES = 2 * 1024 * 1024 * 1024;
export const OPENAI_CHUNK_BYTES = MAX_API_UPLOAD_BYTES;
/** WAV 16 kHz mono ≈ 32 KB/s → ~90 s per chunk sotto 3 MB (limite Vercel 4.5 MB). */
const SEGMENT_SECONDS = 90;
const FFMPEG_CORE_VERSION = "0.12.6";
const MIN_AUDIO_BYTES = 512;
const FFMPEG_LOAD_TIMEOUT_MS = 120_000;

function ffmpegCoreBaseUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/ffmpeg`;
  }
  return "/ffmpeg";
}

export type MediaPrepProgress = {
  stage: "loading" | "extracting" | "splitting" | "ready";
  message: string;
  percent: number;
};

export interface PreparedAudioChunk {
  name: string;
  blob: Blob;
  mimeType: string;
  index: number;
  total: number;
}

export type MediaPrepareResult =
  | { mode: "direct"; file: File }
  | { mode: "chunks"; chunks: PreparedAudioChunk[] };

const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|mkv|avi)$/i;
const MEDIA_EXTENSIONS = /\.(mp3|m4a|wav|mp4|webm|mov|mkv|avi)$/i;

const AUDIO_OUTPUT = {
  extension: ".wav",
  mimeType: "audio/wav",
  name: "output.wav",
};

const WAV_ENCODE_ARGS = ["-ac", "1", "-ar", "16000", "-sample_fmt", "s16", "-c:a", "pcm_s16le"];

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoading: Promise<FFmpeg> | null = null;

function isVideoFile(name: string, mimeType: string): boolean {
  return VIDEO_EXTENSIONS.test(name) || mimeType.startsWith("video/");
}

function fileBaseName(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

function bytesToBlob(bytes: Uint8Array, type: string): Blob {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy], { type });
}

function assertValidWav(bytes: Uint8Array, context: string): void {
  if (bytes.byteLength < MIN_AUDIO_BYTES) {
    throw new Error(
      `${context} Verifica che il video contenga una traccia audio valida.`
    );
  }

  const header = String.fromCharCode(...bytes.subarray(0, 4));
  const wave = String.fromCharCode(...bytes.subarray(8, 12));
  if (header !== "RIFF" || wave !== "WAVE") {
    throw new Error(
      `${context} Il formato audio prodotto non è valido. Riprova con un altro file.`
    );
  }
}

async function runFfmpeg(ffmpeg: FFmpeg, args: string[]): Promise<void> {
  const exitCode = await ffmpeg.exec(["-y", ...args]);
  if (exitCode !== 0) {
    throw new Error(
      "Elaborazione audio non riuscita. Verifica che il file contenga audio."
    );
  }
}

async function fetchBlobUrl(url: string, mimeType: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download non riuscito: ${url}`);
  }
  const buffer = await response.arrayBuffer();
  const blob = new Blob([buffer], { type: mimeType });
  return URL.createObjectURL(blob);
}

async function loadFfmpeg(onProgress?: (percent: number) => void): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) {
    return ffmpegInstance;
  }

  if (ffmpegLoading) {
    return ffmpegLoading;
  }

  ffmpegLoading = (async () => {
    try {
      const ffmpeg = new FFmpeg();
      ffmpeg.on("log", ({ message }) => {
        if (message.toLowerCase().includes("error")) {
          console.warn("[ffmpeg]", message);
        }
      });
      ffmpeg.on("progress", ({ progress }) => {
        onProgress?.(Math.min(100, Math.round(progress * 100)));
      });

      onProgress?.(2);

      const baseUrl = ffmpegCoreBaseUrl();
      onProgress?.(10);

      const [coreURL, wasmURL] = await Promise.all([
        fetchBlobUrl(`${baseUrl}/ffmpeg-core.js`, "text/javascript"),
        fetchBlobUrl(`${baseUrl}/ffmpeg-core.wasm`, "application/wasm"),
      ]);

      onProgress?.(70);

      const loadPromise = ffmpeg.load({ coreURL, wasmURL });

      await Promise.race([
        loadPromise,
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(
              new Error(
                "Caricamento motore audio troppo lento. Controlla la connessione e riprova."
              )
            );
          }, FFMPEG_LOAD_TIMEOUT_MS);
        }),
      ]);

      onProgress?.(100);
      ffmpegInstance = ffmpeg;
      return ffmpeg;
    } catch (error) {
      ffmpegLoading = null;
      throw error instanceof Error
        ? error
        : new Error("Caricamento motore audio non riuscito.");
    }
  })();

  return ffmpegLoading;
}

async function readFfmpegFile(ffmpeg: FFmpeg, name: string): Promise<Uint8Array | null> {
  try {
    const data = await ffmpeg.readFile(name);
    if (data instanceof Uint8Array) {
      return data;
    }
    return new TextEncoder().encode(String(data));
  } catch {
    return null;
  }
}

export function isLeanEventMediaFile(name: string): boolean {
  return MEDIA_EXTENSIONS.test(name);
}

export async function prepareMediaForTranscription(
  file: File,
  onProgress: (progress: MediaPrepProgress) => void
): Promise<MediaPrepareResult> {
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("File troppo grande. Dimensione massima: 2 GB.");
  }

  if (!isLeanEventMediaFile(file.name)) {
    throw new Error(
      "Formato non supportato. Usa mp3, m4a, wav, mp4, webm, mov, mkv o avi."
    );
  }

  const needsProcessing =
    isVideoFile(file.name, file.type) || file.size > OPENAI_CHUNK_BYTES;

  if (!needsProcessing) {
    return { mode: "direct", file };
  }

  onProgress({
    stage: "loading",
    message: "Download motore audio (~30 MB)...",
    percent: 0,
  });

  const ffmpeg = await loadFfmpeg((percent) => {
    onProgress({
      stage: "loading",
      message:
        percent < 70
          ? "Download motore audio (~30 MB)..."
          : "Avvio motore audio...",
      percent,
    });
  });

  onProgress({
    stage: "extracting",
    message: "Estrazione audio dal video (WAV 16 kHz)...",
    percent: 5,
  });

  const inputExt = file.name.match(/\.[^.]+$/)?.[0] ?? ".bin";
  const inputName = `input${inputExt}`;
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  await runFfmpeg(ffmpeg, [
    "-i",
    inputName,
    "-map",
    "0:a:0?",
    "-vn",
    ...WAV_ENCODE_ARGS,
    AUDIO_OUTPUT.name,
  ]);

  const audioData = await readFfmpegFile(ffmpeg, AUDIO_OUTPUT.name);
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(AUDIO_OUTPUT.name);

  if (!audioData) {
    throw new Error("Estrazione audio non riuscita.");
  }

  assertValidWav(audioData, "Audio estratto vuoto o corrotto.");

  if (audioData.byteLength <= OPENAI_CHUNK_BYTES) {
    onProgress({
      stage: "ready",
      message: "Audio pronto per la trascrizione.",
      percent: 100,
    });

    return {
      mode: "chunks",
      chunks: [
        {
          name: `${fileBaseName(file.name)}${AUDIO_OUTPUT.extension}`,
          blob: bytesToBlob(audioData, AUDIO_OUTPUT.mimeType),
          mimeType: AUDIO_OUTPUT.mimeType,
          index: 1,
          total: 1,
        },
      ],
    };
  }

  onProgress({
    stage: "splitting",
    message: "Suddivisione audio in parti da ~90 secondi...",
    percent: 55,
  });

  await ffmpeg.writeFile("full.wav", audioData);
  await runFfmpeg(ffmpeg, [
    "-i",
    "full.wav",
    "-f",
    "segment",
    "-segment_time",
    String(SEGMENT_SECONDS),
    "-reset_timestamps",
    "1",
    ...WAV_ENCODE_ARGS,
    "chunk_%03d.wav",
  ]);
  await ffmpeg.deleteFile("full.wav");

  const chunks: PreparedAudioChunk[] = [];
  /** Fino a ~3 h a 90 s per chunk (120 × 90 s). */
  for (let index = 0; index < 120; index += 1) {
    const chunkName = `chunk_${String(index).padStart(3, "0")}.wav`;
    const chunkData = await readFfmpegFile(ffmpeg, chunkName);
    if (!chunkData) {
      break;
    }

    assertValidWav(chunkData, `Parte audio ${index + 1} non valida.`);

    if (chunkData.byteLength >= OPENAI_CHUNK_BYTES) {
      throw new Error(
        `Parte audio ${index + 1} troppo grande. Riduci la durata del video o contattaci.`
      );
    }

    chunks.push({
      name: chunkName,
      blob: bytesToBlob(chunkData, AUDIO_OUTPUT.mimeType),
      mimeType: AUDIO_OUTPUT.mimeType,
      index: index + 1,
      total: 0,
    });
    await ffmpeg.deleteFile(chunkName);
  }

  if (chunks.length === 0) {
    throw new Error("Suddivisione audio non riuscita.");
  }

  const total = chunks.length;
  for (const chunk of chunks) {
    chunk.total = total;
  }

  onProgress({
    stage: "ready",
    message: `Audio pronto: ${total} ${total === 1 ? "parte" : "parti"}.`,
    percent: 100,
  });

  return { mode: "chunks", chunks };
}
