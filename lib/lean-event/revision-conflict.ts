import { NextResponse } from "next/server";

import { LeanEventRevisionConflictError } from "@/lib/lean-event/entity-lifecycle";

export interface RevisionConflictPayload {
  error: "REVISION_CONFLICT";
  message: string;
  currentRevision: number;
  updatedAt: string;
  updatedBy?: string;
}

export function revisionConflictResponse(
  error: LeanEventRevisionConflictError
): NextResponse<RevisionConflictPayload> {
  return NextResponse.json(
    {
      error: "REVISION_CONFLICT",
      message:
        "Un altro utente ha modificato questo elemento. Ricarica i dati per continuare.",
      currentRevision: error.currentRevision,
      updatedAt: error.updatedAt,
      updatedBy: error.updatedBy,
    },
    { status: 409 }
  );
}

export function isRevisionConflictPayload(
  payload: unknown
): payload is RevisionConflictPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    (payload as RevisionConflictPayload).error === "REVISION_CONFLICT"
  );
}
