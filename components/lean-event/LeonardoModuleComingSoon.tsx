import { LeonardoPageHeader } from "@/components/lean-event/LeonardoPageHeader";

interface LeonardoModuleComingSoonProps {
  title: string;
  subtitle: string;
  packHint?: string;
}

export function LeonardoModuleComingSoon({
  title,
  subtitle,
  packHint,
}: LeonardoModuleComingSoonProps) {
  return (
    <div className="space-y-4">
      <LeonardoPageHeader title={title} subtitle={subtitle} />
      <div className="rounded-xl border border-dashed border-white/15 bg-[#111111] p-8 text-center text-sm text-white/45">
        Modulo in preparazione. Disponibile standalone e collegabile a un evento
        (fase Tools).
        {packHint ? (
          <p className="mt-2 text-xs text-white/35">{packHint}</p>
        ) : null}
      </div>
    </div>
  );
}
