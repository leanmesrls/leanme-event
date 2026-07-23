import { NextResponse } from "next/server";

import { listProductNotifications } from "@/lib/lean-event/notifications";
import { getSession } from "@/lib/lean-event/session";

export const runtime = "nodejs";

/** Notifiche prodotto + rilasci (SoT rilasci: Control Plane Neon). */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notifications = await listProductNotifications();
    return NextResponse.json({ notifications });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Product notifications failed",
      },
      { status: 500 }
    );
  }
}
