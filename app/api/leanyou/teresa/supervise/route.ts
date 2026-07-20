import { NextResponse } from "next/server";

import {
  getTeresaThreadForSupervision,
  listTeresaThreadsForSupervision,
} from "@/lib/lean-event/teresa-supervise";
import {
  forbiddenResponse,
  handleLeanEventRouteError,
  requireSession,
} from "@/lib/lean-event/server-auth";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get("threadId")?.trim();
    const tenantId = searchParams.get("tenantId")?.trim();

    if (threadId) {
      const detail = await getTeresaThreadForSupervision(
        session,
        threadId,
        tenantId
      );
      if (!detail) {
        return NextResponse.json(
          { error: "Conversazione non trovata." },
          { status: 404 }
        );
      }
      return NextResponse.json(detail);
    }

    const threads = await listTeresaThreadsForSupervision(session);
    return NextResponse.json({ threads, scope: "global" });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return forbiddenResponse();
    }
    return handleLeanEventRouteError(
      error,
      "Supervisione Teresa non riuscita."
    );
  }
}
