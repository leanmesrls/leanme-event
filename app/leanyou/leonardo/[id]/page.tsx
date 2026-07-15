import { redirect } from "next/navigation";

import { DEFAULT_PUBLIC_TENANT_SLUG } from "@/lib/leanyou/constants";
import { leanyouLeonardoWorkspacePath } from "@/lib/leanyou/paths";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LeonardoLegacyWorkspacePage({ params }: PageProps) {
  const { id } = await params;
  redirect(leanyouLeonardoWorkspacePath(DEFAULT_PUBLIC_TENANT_SLUG, id));
}
