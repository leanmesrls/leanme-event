import { redirect } from "next/navigation";

import { DEFAULT_PUBLIC_TENANT_SLUG } from "@/lib/leanyou/constants";
import { leanyouLeonardoPath } from "@/lib/leanyou/paths";

export default function LeonardoLegacyIndexPage() {
  redirect(leanyouLeonardoPath(DEFAULT_PUBLIC_TENANT_SLUG));
}
