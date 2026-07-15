import { redirect } from "next/navigation";

import { DEFAULT_PUBLIC_TENANT_SLUG } from "@/lib/leanyou/constants";
import { leanyouLeonardoNewPath } from "@/lib/leanyou/paths";

export default function LeonardoLegacyNewPage() {
  redirect(leanyouLeonardoNewPath(DEFAULT_PUBLIC_TENANT_SLUG));
}
