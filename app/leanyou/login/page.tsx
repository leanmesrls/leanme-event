import { LeanYouLoginPageContent } from "@/components/leanyou/LeanYouLoginPageContent";
import { createPageMetadata } from "@/lib/metadata";
import { leanyouLoginPath } from "@/lib/leanyou/paths";

export const metadata = createPageMetadata({
  title: "LeanYou · Accesso riservato",
  description: "Area riservata clienti LeanMe.",
  path: leanyouLoginPath(),
  noIndex: true,
});

export default function LeanYouLoginPage() {
  return <LeanYouLoginPageContent />;
}
