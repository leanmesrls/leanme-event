import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { put } from "@vercel/blob";

import { getDataRoot } from "./storage";

const BLOB_ROOT = "leanyou/travel-docs";
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function docsDir(tenantId: string, eventId: string, assignmentId: string): string {
  return path.join(
    getDataRoot(),
    "travel-docs",
    tenantId,
    eventId,
    assignmentId
  );
}

function extensionForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "application/pdf") return "pdf";
  return "jpg";
}

export function isTravelBlobStorageEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

export function validateTravelDocumentFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Formato non supportato. Usa JPG, PNG, WebP o PDF.";
  }
  if (file.size > MAX_BYTES) {
    return "File troppo grande (max 8 MB).";
  }
  return null;
}

export async function saveTravelDocumentFile(input: {
  tenantId: string;
  eventId: string;
  assignmentId: string;
  segmentId: string;
  side: "document" | "front" | "back";
  file: File;
}): Promise<string> {
  const validationError = validateTravelDocumentFile(input.file);
  if (validationError) {
    throw new Error(validationError);
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const ext = extensionForMime(input.file.type);
  const filename = `${input.segmentId}-${input.side}.${ext}`;

  if (isTravelBlobStorageEnabled()) {
    const pathname = `${BLOB_ROOT}/${input.tenantId}/${input.eventId}/${input.assignmentId}/${filename}`;
    const blob = await put(pathname, buffer, {
      access: "public",
      contentType: input.file.type,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return blob.url;
  }

  const dir = docsDir(input.tenantId, input.eventId, input.assignmentId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return `/api/leanyou/events/${input.eventId}/assignments/${input.assignmentId}/travel-document?segmentId=${input.segmentId}&side=${input.side}`;
}

export async function readTravelDocumentFile(input: {
  tenantId: string;
  eventId: string;
  assignmentId: string;
  segmentId: string;
  side: string;
}): Promise<{ buffer: Buffer; contentType: string } | null> {
  for (const ext of ["jpg", "jpeg", "png", "webp", "pdf"]) {
    try {
      const buffer = await readFile(
        path.join(
          docsDir(input.tenantId, input.eventId, input.assignmentId),
          `${input.segmentId}-${input.side}.${ext}`
        )
      );
      const contentType =
        ext === "pdf"
          ? "application/pdf"
          : ext === "png"
            ? "image/png"
            : ext === "webp"
              ? "image/webp"
              : "image/jpeg";
      return { buffer, contentType };
    } catch {
      // try next
    }
  }
  return null;
}
