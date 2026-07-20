import { LeanEventLoginPageContent } from "@/components/lean-event/LeanEventLoginPageContent";
import { createPageMetadata } from "@/lib/metadata";
import { leanEventLoginPath } from "@/lib/lean-event/paths";

export const metadata = createPageMetadata({
  title: "LeanEvent · Accesso riservato",
  description: "Area riservata clienti LeanMe.",
  path: leanEventLoginPath(),
  noIndex: true,
});

/** Entry LeanEvent: /lean-event */
export default function LeanEventLoginPage() {
  return <LeanEventLoginPageContent />;
}
