import { redirect } from "next/navigation";

import { leanEventLoginPath } from "@/lib/lean-event/paths";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LeanEventTenantLoginRedirectPage({
  searchParams,
}: PageProps) {
  const query = await searchParams;
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") {
      params.set(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, entry));
    }
  }

  const suffix = params.toString();
  redirect(suffix ? `${leanEventLoginPath()}?${suffix}` : leanEventLoginPath());
}
