import { redirect } from "next/navigation";

import { DEFAULT_PUBLIC_TENANT_SLUG } from "@/lib/lean-event/constants";
import { leanEventLeonardoNewPath } from "@/lib/lean-event/paths";

export default function LeonardoLegacyNewPage() {
  redirect(leanEventLeonardoNewPath(DEFAULT_PUBLIC_TENANT_SLUG));
}
