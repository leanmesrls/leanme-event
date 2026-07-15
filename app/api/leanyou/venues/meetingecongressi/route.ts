import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/leanyou/auth";
import { importAllMeetingCongressiCatalog, importMeetingCongressiVenues } from "@/lib/leanyou/import-meetingecongressi";
import { searchMeetingCongressiCatalog } from "@/lib/leanyou/meetingecongressi-catalog";
import {
  forbiddenResponse,
  handleLeanYouRouteError,
  requireSession,
} from "@/lib/leanyou/server-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "eventi")
    ) {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(request.url);
    const result = await searchMeetingCongressiCatalog({
      query: searchParams.get("q") ?? undefined,
      region: searchParams.get("region") ?? undefined,
      city: searchParams.get("city") ?? undefined,
      limit: Number(searchParams.get("limit") ?? "30"),
      offset: Number(searchParams.get("offset") ?? "0"),
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return handleLeanYouRouteError(
      error,
      "Ricerca catalogo Meeting e Congressi non riuscita."
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "eventi")
    ) {
      return forbiddenResponse();
    }

    const body = (await request.json()) as {
      links?: string[];
      importAll?: boolean;
    };

    if (body.importAll) {
      const result = await importAllMeetingCongressiCatalog(session);
      return NextResponse.json({ ok: true, ...result });
    }

    const links = Array.isArray(body.links) ? body.links : [];

    const result = await importMeetingCongressiVenues(session, links);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return handleLeanYouRouteError(
      error,
      "Importazione da Meeting e Congressi non riuscita."
    );
  }
}
