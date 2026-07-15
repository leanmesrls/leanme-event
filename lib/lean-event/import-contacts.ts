import type {
  ContactImportApplyPayload,
  LeanEventImportResult,
  LeanEventSession,
} from "@/types/lean-event";

import {
  applyContactsImport,
  previewContactsImport,
} from "./contact-import-merge";

export async function previewContactImportFromRows(
  session: LeanEventSession,
  rows: Record<string, string>[]
) {
  return previewContactsImport(session, rows);
}

export async function applyContactImportFromRows(
  session: LeanEventSession,
  rows: Record<string, string>[],
  payload: ContactImportApplyPayload
): Promise<LeanEventImportResult> {
  return applyContactsImport(session, rows, payload);
}
