import { redirect } from "next/navigation";

import { DEFAULT_PUBLIC_TENANT_SLUG } from "@/lib/lean-event/constants";
import { leanEventLeonardoWorkspacePath } from "@/lib/lean-event/paths";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LeonardoLegacyWorkspacePage({ params }: PageProps) {
  const { id } = await params;
  redirect(leanEventLeonardoWorkspacePath(DEFAULT_PUBLIC_TENANT_SLUG, id));
}
