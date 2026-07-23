import { NextResponse } from "next/server";

import { getBuildInformation } from "@/core/infrastructure/build-info/build-info";

export const runtime = "nodejs";

export async function GET() {
  const info = getBuildInformation();
  return NextResponse.json({
    ok: true,
    product: info.productName,
    architectureVersion: info.architectureVersion,
    environment: info.environment,
    services: info.services,
  });
}
