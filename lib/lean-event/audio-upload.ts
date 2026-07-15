const MIN_AUDIO_BYTES = 512;

export function normalizeAudioForOpenAI(
  buffer: Buffer,
  filename: string,
  mimeType: string
): { buffer: Buffer; filename: string; mimeType: string } {
  if (buffer.byteLength < MIN_AUDIO_BYTES) {
    throw new Error(
      "File audio vuoto o corrotto. Verifica che il video contenga una traccia audio."
    );
  }

  const lowerName = filename.toLowerCase();
  let normalizedName = filename;
  let normalizedMime = mimeType || "application/octet-stream";

  if (lowerName.endsWith(".wav") || normalizedMime.includes("wav")) {
    normalizedName = ensureExtension(filename, ".wav");
    normalizedMime = "audio/wav";
    assertWavHeader(buffer);
  } else if (lowerName.endsWith(".m4a") || normalizedMime.includes("m4a")) {
    normalizedName = ensureExtension(filename, ".m4a");
    normalizedMime = "audio/mp4";
  } else if (lowerName.endsWith(".webm") || normalizedMime.includes("webm")) {
    normalizedName = ensureExtension(filename, ".webm");
    normalizedMime = "audio/webm";
  } else if (lowerName.endsWith(".mp3") || normalizedMime.includes("mpeg")) {
    normalizedName = ensureExtension(filename, ".mp3");
    normalizedMime = "audio/mpeg";
  } else if (lowerName.endsWith(".mp4") || normalizedMime.startsWith("video/")) {
    normalizedName = ensureExtension(filename, ".mp4");
    normalizedMime = "video/mp4";
  }

  return { buffer, filename: normalizedName, mimeType: normalizedMime };
}

function ensureExtension(filename: string, extension: string): string {
  if (filename.toLowerCase().endsWith(extension)) {
    return filename;
  }
  const base = filename.replace(/\.[^.]+$/, "");
  return `${base}${extension}`;
}

function assertWavHeader(buffer: Buffer): void {
  if (buffer.byteLength < 12) {
    throw new Error("File WAV non valido.");
  }

  const riff = buffer.toString("ascii", 0, 4);
  const wave = buffer.toString("ascii", 8, 12);
  if (riff !== "RIFF" || wave !== "WAVE") {
    throw new Error(
      "File WAV non valido dopo elaborazione. Riprova con un altro video."
    );
  }
}
