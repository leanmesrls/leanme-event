import type {
  ContactImportApplyPayload,
  LeanYouImportResult,
  LeanYouSession,
} from "@/types/leanyou";

import {
  applyContactsImport,
  previewContactsImport,
} from "./contact-import-merge";

export async function previewContactImportFromRows(
  session: LeanYouSession,
  rows: Record<string, string>[]
) {
  return previewContactsImport(session, rows);
}

export async function applyContactImportFromRows(
  session: LeanYouSession,
  rows: Record<string, string>[],
  payload: ContactImportApplyPayload
): Promise<LeanYouImportResult> {
  return applyContactsImport(session, rows, payload);
}
