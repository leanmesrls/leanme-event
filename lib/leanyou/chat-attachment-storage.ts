import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { put } from "@vercel/blob";

import { getDataRoot } from "./storage";

const BLOB_ROOT = "leanyou/event-chat";
const MAX_BYTES = 5 * 1024 * 1024;

function attachmentDir(tenantId: string, eventId: string): string {
  return path.join(getDataRoot(), "event-chat", tenantId, eventId);
}

function isBlobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

export function validateChatAttachment(file: File): string | null {
  const allowed =
    file.type.startsWith("image/") ||
    file.type === "application/pdf" ||
    file.type.startsWith("text/");

  if (!allowed) {
    return "Formato non supportato. Usa immagini, PDF o file di testo.";
  }
  if (file.size > MAX_BYTES) {
    return "File troppo grande (max 5 MB).";
  }
  return null;
}

export async function saveChatAttachmentFile(input: {
  tenantId: string;
  eventId: string;
  attachmentId: string;
  file: File;
}): Promise<string> {
  const validationError = validateChatAttachment(input.file);
  if (validationError) {
    throw new Error(validationError);
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const safeName = input.file.name.replace(/[^\w.\-() ]+/g, "_").slice(0, 80);
  const filename = `${input.attachmentId}-${safeName}`;

  if (isBlobEnabled()) {
    const pathname = `${BLOB_ROOT}/${input.tenantId}/${input.eventId}/${filename}`;
    const blob = await put(pathname, buffer, {
      access: "public",
      contentType: input.file.type || "application/octet-stream",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return blob.url;
  }

  const dir = attachmentDir(input.tenantId, input.eventId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return `/api/leanyou/events/${input.eventId}/chat/attachment?id=${input.attachmentId}&name=${encodeURIComponent(safeName)}`;
}
