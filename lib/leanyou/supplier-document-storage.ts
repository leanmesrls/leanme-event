import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { put } from "@vercel/blob";

import { getDataRoot } from "./storage";

const BLOB_ROOT = "leanyou/supplier-documents";
const MAX_BYTES = 15 * 1024 * 1024;

function isBlobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
}

export function validateSupplierDocument(file: File): string | null {
  const allowed =
    file.type.startsWith("image/") ||
    file.type === "application/pdf" ||
    file.type.startsWith("text/") ||
    file.type === "application/msword" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.type === "application/vnd.ms-excel" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  if (!allowed) {
    return "Formato non supportato. Usa PDF, immagini, Word o Excel.";
  }
  if (file.size > MAX_BYTES) {
    return "File troppo grande (max 15 MB).";
  }
  return null;
}

export async function saveSupplierDocumentFile(input: {
  tenantId: string;
  scope: "rubrica" | "event";
  scopeId: string;
  documentId: string;
  file: File;
}): Promise<string> {
  const validationError = validateSupplierDocument(input.file);
  if (validationError) {
    throw new Error(validationError);
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const safeName = sanitizeFileName(input.file.name);
  const filename = `${input.documentId}-${safeName}`;

  if (isBlobEnabled()) {
    const pathname = `${BLOB_ROOT}/${input.tenantId}/${input.scope}/${input.scopeId}/${filename}`;
    const blob = await put(pathname, buffer, {
      access: "public",
      contentType: input.file.type || "application/octet-stream",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return blob.url;
  }

  const dir = path.join(
    getDataRoot(),
    "supplier-documents",
    input.tenantId,
    input.scope,
    input.scopeId
  );
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);

  if (input.scope === "rubrica") {
    return `/api/leanyou/suppliers/${input.scopeId}/documents/file?id=${input.documentId}&name=${encodeURIComponent(safeName)}`;
  }

  const [eventId, linkId] = input.scopeId.split("__");
  return `/api/leanyou/events/${eventId}/suppliers/${linkId}/documents/file?id=${input.documentId}&name=${encodeURIComponent(safeName)}`;
}
