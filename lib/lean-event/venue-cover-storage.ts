import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  isPostgresBinaryStoreEnabled,
  readLegacyBinaryFromPostgres,
  storeLegacyBinaryInPostgres,
} from "@/lib/lean-event/legacy-binary-postgres";
import { getDataRoot } from "./storage";

const BLOB_ROOT = "lean-event/venue-covers";
const MAX_COVER_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function coverDir(tenantId: string): string {
  return path.join(getDataRoot(), "venue-covers", tenantId);
}

function coverFilePath(tenantId: string, venueId: string, ext: string): string {
  return path.join(coverDir(tenantId), `${venueId}.${ext}`);
}

function extensionForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

export function validateVenueCoverFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Formato non supportato. Usa JPG, PNG o WebP.";
  }
  if (file.size > MAX_COVER_BYTES) {
    return "Immagine troppo grande (max 5 MB).";
  }
  return null;
}

export async function saveVenueCoverFile(
  tenantId: string,
  venueId: string,
  file: File
): Promise<string> {
  const validationError = validateVenueCoverFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = extensionForMime(file.type);
  const pathname = `${BLOB_ROOT}/${tenantId}/${venueId}.${ext}`;

  if (isPostgresBinaryStoreEnabled()) {
    await storeLegacyBinaryInPostgres({
      tenantId,
      kind: "other",
      filename: `${venueId}.${ext}`,
      mime: file.type,
      file: buffer,
      legacyPath: pathname,
      meta: { venueId, role: "venue_cover" },
    });
    return `/api/lean-event/venues/${venueId}/cover`;
  }

  const dir = coverDir(tenantId);
  await mkdir(dir, { recursive: true });
  await writeFile(coverFilePath(tenantId, venueId, ext), buffer);
  return `/api/lean-event/venues/${venueId}/cover`;
}

export async function readVenueCoverFile(
  tenantId: string,
  venueId: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  for (const ext of ["jpg", "jpeg", "png", "webp", "gif"]) {
    const pathname = `${BLOB_ROOT}/${tenantId}/${venueId}.${ext}`;
    const fromPg = await readLegacyBinaryFromPostgres({
      tenantId,
      legacyPath: pathname,
    });
    if (fromPg) return fromPg;
  }

  for (const ext of ["jpg", "jpeg", "png", "webp", "gif"]) {
    try {
      const buffer = await readFile(coverFilePath(tenantId, venueId, ext));
      const contentType =
        ext === "png"
          ? "image/png"
          : ext === "webp"
            ? "image/webp"
            : ext === "gif"
              ? "image/gif"
              : "image/jpeg";
      return { buffer, contentType };
    } catch {
      // try next extension
    }
  }
  return null;
}
