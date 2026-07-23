import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  isPostgresBinaryStoreEnabled,
  storeLegacyBinaryInPostgres,
} from "@/lib/lean-event/legacy-binary-postgres";
import { getDataRoot } from "./storage";

const BLOB_ROOT = "lean-event/event-chat";
const MAX_BYTES = 5 * 1024 * 1024;

function attachmentDir(tenantId: string, eventId: string): string {
  return path.join(getDataRoot(), "event-chat", tenantId, eventId);
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
  const apiUrl = `/api/lean-event/events/${input.eventId}/chat/attachment?id=${input.attachmentId}&name=${encodeURIComponent(safeName)}`;
  const pathname = `${BLOB_ROOT}/${input.tenantId}/${input.eventId}/${filename}`;

  if (isPostgresBinaryStoreEnabled()) {
    await storeLegacyBinaryInPostgres({
      tenantId: input.tenantId,
      kind: "other",
      filename,
      mime: input.file.type || "application/octet-stream",
      file: buffer,
      legacyPath: pathname,
      eventId: input.eventId,
      meta: { attachmentId: input.attachmentId },
    });
    return apiUrl;
  }

  const dir = attachmentDir(input.tenantId, input.eventId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return apiUrl;
}
