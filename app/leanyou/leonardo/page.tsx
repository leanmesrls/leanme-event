import { redirect } from "next/navigation";

import { DEFAULT_PUBLIC_TENANT_SLUG } from "@/lib/lean-event/constants";
import { leanEventLeonardoPath } from "@/lib/lean-event/paths";

export default function LeonardoLegacyIndexPage() {
  redirect(leanEventLeonardoPath(DEFAULT_PUBLIC_TENANT_SLUG));
}
