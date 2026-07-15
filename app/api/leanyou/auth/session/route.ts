import { NextResponse } from "next/server";

import { getSession } from "@/lib/lean-event/session";

export async function GET() {
  const session = await getSession();
  return NextResponse.json({ session });
}
