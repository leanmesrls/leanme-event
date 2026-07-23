import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  isPostgresBinaryStoreEnabled,
  storeLegacyBinaryInPostgres,
} from "@/lib/lean-event/legacy-binary-postgres";
import { getDataRoot } from "./storage";

const BLOB_ROOT = "lean-event/supplier-documents";
const MAX_BYTES = 15 * 1024 * 1024;

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
  const apiUrl =
    input.scope === "rubrica"
      ? `/api/lean-event/suppliers/${input.scopeId}/documents/file?id=${input.documentId}&name=${encodeURIComponent(safeName)}`
      : (() => {
          const [eventId, linkId] = input.scopeId.split("__");
          return `/api/lean-event/events/${eventId}/suppliers/${linkId}/documents/file?id=${input.documentId}&name=${encodeURIComponent(safeName)}`;
        })();

  const pathname = `${BLOB_ROOT}/${input.tenantId}/${input.scope}/${input.scopeId}/${filename}`;
  let eventId: string | null = null;
  let supplierId: string | null = null;
  if (input.scope === "rubrica") supplierId = input.scopeId;
  if (input.scope === "event") {
    eventId = input.scopeId.split("__")[0] || null;
  }

  if (isPostgresBinaryStoreEnabled()) {
    await storeLegacyBinaryInPostgres({
      tenantId: input.tenantId,
      kind: "supplier_agreement",
      filename,
      mime: input.file.type || "application/octet-stream",
      file: buffer,
      legacyPath: pathname,
      eventId,
      supplierId,
      meta: { scope: input.scope, scopeId: input.scopeId },
    });
    return apiUrl;
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
  return apiUrl;
}
