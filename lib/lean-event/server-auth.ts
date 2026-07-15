import { getSession } from "@/lib/lean-event/session";
import { isRevisionConflictError } from "@/lib/lean-event/entity-lifecycle";
import { revisionConflictResponse } from "@/lib/lean-event/revision-conflict";
import type { LeanEventSession } from "@/types/lean-event";

export async function requireSession(): Promise<LeanEventSession> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export function unauthorizedResponse() {
  return Response.json({ error: "Non autorizzato." }, { status: 401 });
}

export function forbiddenResponse() {
  return Response.json({ error: "Accesso negato." }, { status: 403 });
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.message === "UNAUTHORIZED";
}

export function handleLeanEventRouteError(
  error: unknown,
  fallbackMessage: string
) {
  if (isUnauthorizedError(error)) {
    return unauthorizedResponse();
  }

  if (isRevisionConflictError(error)) {
    return revisionConflictResponse(error);
  }

  console.error(
    JSON.stringify({
      leanyou_route_error: {
        message: error instanceof Error ? error.message : String(error),
      },
    })
  );

  return Response.json({ error: fallbackMessage }, { status: 500 });
}
