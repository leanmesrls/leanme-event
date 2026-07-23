import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  isPostgresBinaryStoreEnabled,
  readLegacyBinaryFromPostgres,
  storeLegacyBinaryInPostgres,
} from "@/lib/lean-event/legacy-binary-postgres";
import { getDataRoot } from "./storage";

const LEGACY_PATH_ROOT = "lean-event/travel-docs";
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

function contentTypeForExt(ext: string): string {
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
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

function apiUrl(
  eventId: string,
  assignmentId: string,
  segmentId: string,
  side: string
): string {
  return `/api/lean-event/events/${eventId}/assignments/${assignmentId}/travel-document?segmentId=${segmentId}&side=${side}`;
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
  const pathname = `${LEGACY_PATH_ROOT}/${input.tenantId}/${input.eventId}/${input.assignmentId}/${filename}`;

  if (isPostgresBinaryStoreEnabled()) {
    await storeLegacyBinaryInPostgres({
      tenantId: input.tenantId,
      kind: "travel_id",
      filename,
      mime: input.file.type || "application/octet-stream",
      file: buffer,
      legacyPath: pathname,
      eventId: input.eventId,
      assignmentId: input.assignmentId,
    });
    return apiUrl(input.eventId, input.assignmentId, input.segmentId, input.side);
  }

  const dir = docsDir(input.tenantId, input.eventId, input.assignmentId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return apiUrl(input.eventId, input.assignmentId, input.segmentId, input.side);
}

export async function readTravelDocumentFile(input: {
  tenantId: string;
  eventId: string;
  assignmentId: string;
  segmentId: string;
  side: string;
}): Promise<{ buffer: Buffer; contentType: string } | null> {
  const extensions = ["jpg", "jpeg", "png", "webp", "pdf"];

  for (const ext of extensions) {
    const pathname = `${LEGACY_PATH_ROOT}/${input.tenantId}/${input.eventId}/${input.assignmentId}/${input.segmentId}-${input.side}.${ext}`;
    const fromPg = await readLegacyBinaryFromPostgres({
      tenantId: input.tenantId,
      legacyPath: pathname,
    });
    if (fromPg) return fromPg;
  }

  // Local FS only (dev without DB) — no Blob
  for (const ext of extensions) {
    try {
      const buffer = await readFile(
        path.join(
          docsDir(input.tenantId, input.eventId, input.assignmentId),
          `${input.segmentId}-${input.side}.${ext}`
        )
      );
      return { buffer, contentType: contentTypeForExt(ext === "jpeg" ? "jpg" : ext) };
    } catch {
      // try next
    }
  }

  return null;
}
