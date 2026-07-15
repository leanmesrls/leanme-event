import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import {
  forbiddenResponse,
  handleLeanEventRouteError,
  requireSession,
} from "@/lib/lean-event/server-auth";
import { readVenueCoverFile } from "@/lib/lean-event/venue-cover-storage";
import { getVenue } from "@/lib/lean-event/venues";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function fetchExternalCover(
  url: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "LeanEvent-VenueCover/1.0",
        Accept: "image/*",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) {
      return null;
    }

    return { buffer, contentType };
  } catch {
    return null;
  }
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "eventi")
    ) {
      return forbiddenResponse();
    }

    const { id } = await context.params;
    const venue = await getVenue(session.tenantId, id);
    if (!venue) {
      return NextResponse.json({ error: "Sede non trovata." }, { status: 404 });
    }

    const coverUrl = venue.coverImageUrl?.trim() ?? "";
    if (coverUrl.startsWith("http://") || coverUrl.startsWith("https://")) {
      const proxied = await fetchExternalCover(coverUrl);
      if (proxied) {
        return new NextResponse(new Uint8Array(proxied.buffer), {
          headers: {
            "Content-Type": proxied.contentType,
            "Cache-Control": "private, max-age=86400",
          },
        });
      }
    }

    const cover = await readVenueCoverFile(session.tenantId, id);
    if (!cover) {
      return NextResponse.json(
        { error: "Immagine non trovata." },
        { status: 404 }
      );
    }

    return new NextResponse(new Uint8Array(cover.buffer), {
      headers: {
        "Content-Type": cover.contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return handleLeanEventRouteError(error, "Caricamento immagine non riuscito.");
  }
}
