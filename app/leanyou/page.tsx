import { redirect } from "next/navigation";

import { leanEventLoginPath } from "@/lib/lean-event/paths";

export default function LeanEventRootPage() {
  redirect(leanEventLoginPath());
}
