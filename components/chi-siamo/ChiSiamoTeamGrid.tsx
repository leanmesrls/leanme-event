import Image from "next/image";
import Link from "next/link";
import { COMIC_ROW_LAYOUT } from "@/components/chi-siamo/ChiSiamoComicRow";
import type { ChiSiamoData } from "@/types/content";

interface ChiSiamoTeamGridProps {
  team: ChiSiamoData["team"];
}

const { columns, aspectRatio } = COMIC_ROW_LAYOUT.row2;

export function ChiSiamoTeamGrid({ team }: ChiSiamoTeamGridProps) {
  return (
    <>
      <div
        id="team"
        className="hidden w-full gap-0 overflow-hidden md:grid"
        style={{ gridTemplateColumns: columns, aspectRatio }}
      >
        {team.members.map((member) => (
          <article
            key={member.slug}
            className="relative m-0 h-full min-h-0 w-full overflow-hidden"
          >
            <Image
              src={member.image}
              alt={`${member.name}${member.role ? ` — ${member.role}` : ""}`}
              fill
              className="object-cover object-top"
              sizes="25vw"
            />
            {member.cta && (
              <Link
                href={member.cta.href}
                className="absolute inset-x-[10%] bottom-[3.5%] top-[84%] z-10 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-leanme-fuchsia focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                aria-label={`${member.cta.label} — ${member.name}`}
              />
            )}
          </article>
        ))}
      </div>

      <div className="flex flex-col gap-0 md:hidden">
        {team.members.map((member) => (
          <article
            key={member.slug}
            className="relative m-0 block w-full leading-none"
          >
            <Image
              src={member.image}
              alt={`${member.name}${member.role ? ` — ${member.role}` : ""}`}
              width={320}
              height={406}
              className="block h-auto w-full"
              sizes="100vw"
            />
            {member.cta && (
              <Link
                href={member.cta.href}
                className="absolute inset-x-[10%] bottom-[3.5%] top-[84%] z-10 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-leanme-fuchsia focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                aria-label={`${member.cta.label} — ${member.name}`}
              />
            )}
          </article>
        ))}
      </div>
    </>
  );
}
