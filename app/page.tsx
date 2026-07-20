import { redirect } from "next/navigation";

import { leanEventLoginPath } from "@/lib/lean-event/paths";

/** Entry Lean Event: solo area riservata (login). */
export default function HomePage() {
  redirect(leanEventLoginPath());
}
