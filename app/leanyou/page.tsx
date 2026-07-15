import { redirect } from "next/navigation";

import { leanyouLoginPath } from "@/lib/leanyou/paths";

export default function LeanYouRootPage() {
  redirect(leanyouLoginPath());
}
