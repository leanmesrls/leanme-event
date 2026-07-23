import { NextResponse } from "next/server";

import { getBuildInformation } from "@/core/infrastructure/build-info/build-info";
import { requireActiveTenantBySlug } from "@/core/infrastructure/tenant-registry/tenant-registry";
import { getSession } from "@/lib/lean-event/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const slug = url.searchParams.get("tenantSlug") || session.tenantSlug;
    if (!slug) {
      return NextResponse.json({ error: "tenantSlug required" }, { status: 400 });
    }

    // Platform admins later; for now tenant session scoped to own slug.
    if (slug !== session.tenantSlug) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let tenant = null;
    try {
      tenant = await requireActiveTenantBySlug(slug);
    } catch {
      // During cutover, registry may not be seeded yet.
      tenant = null;
    }

    return NextResponse.json(getBuildInformation(tenant ?? undefined));
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Build info failed",
      },
      { status: 500 }
    );
  }
}
