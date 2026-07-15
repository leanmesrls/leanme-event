import Image from "next/image";
import Link from "next/link";

import { ArrowIcon } from "@/components/homepage/Icons";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { agentCardImageClassName, agentCardImageSrc } from "@/lib/agent-images";
import { cn } from "@/lib/utils";
import type { LeanAgent, Specialist, TeamMember } from "@/types/content";

interface LeanAgentProfileProps {
  agent: LeanAgent;
  collaborators: LeanAgent[];
  humanCollaborators: TeamMember[];
  networkSpecialists: Specialist[];
}

function ProfileSection({
  title,
  children,
  className,
  delay = 0,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <RevealOnScroll delay={delay}>
      <section
        className={cn(
          "rounded-xl border border-white/10 bg-[#111111] p-6 md:p-8",
          className
        )}
      >
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-leanme-fuchsia">
          {title}
        </h2>
        <div className="mt-5">{children}</div>
      </section>
    </RevealOnScroll>
  );
}

function IdentityRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-white/10 py-3 last:border-b-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-3 text-sm leading-relaxed text-white/75"
        >
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-leanme-fuchsia" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function ExternalConnectionCard({ name }: { name: string }) {
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div
        aria-hidden
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-[10px] font-bold uppercase tracking-[0.08em] text-white/70"
      >
        {initials}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold tracking-[0.08em] text-white">{name}</p>
      </div>
    </div>
  );
}

function EcosystemCard({
  name,
  role,
  imageSrc,
  imageAlt,
  href,
  badge,
  initials,
}: {
  name: string;
  role: string;
  imageSrc?: string;
  imageAlt: string;
  href: string;
  badge?: string;
  initials?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 transition hover:border-leanme-fuchsia/40 hover:bg-white/[0.06]"
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/10">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            className="object-cover object-top"
            sizes="48px"
          />
        ) : (
          <div
            aria-hidden
            className="flex h-full w-full items-center justify-center bg-white/[0.06] text-[10px] font-bold uppercase tracking-[0.08em] text-white/70"
          >
            {initials}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold tracking-[0.08em] text-white group-hover:text-leanme-fuchsia">
          {name}
        </p>
        <p className="truncate text-[11px] text-white/55">{role}</p>
        {badge ? (
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-leanme-fuchsia/80">
            {badge}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

export function LeanAgentProfile({
  agent,
  collaborators,
  humanCollaborators,
  networkSpecialists,
}: LeanAgentProfileProps) {
  const profile = agent.profile;
  if (!profile) {
    return null;
  }

  return (
    <div className="bg-black text-white">
      <section
        aria-labelledby="lean-agent-heading"
        className="border-b border-white/10 bg-black"
      >
        <div className="mx-auto max-w-[1440px] px-5 py-10 md:px-10 md:py-12 lg:px-12 lg:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-leanme-fuchsia md:text-sm">
            {profile.title}
          </p>
          <h1
            id="lean-agent-heading"
            className="mt-3 text-3xl font-bold tracking-[0.06em] text-white md:text-4xl lg:text-5xl"
          >
            {agent.name}
          </h1>
          <p className="mt-4 flex flex-wrap gap-x-2 text-sm font-bold uppercase tracking-[0.12em] text-white/90">
            {profile.tagline.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </p>
          <blockquote className="mt-5 max-w-3xl border-l-2 border-leanme-fuchsia pl-4 text-base italic leading-relaxed text-white/75 md:text-lg">
            {profile.quote}
          </blockquote>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#0a0a0a]">
        <div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-10 md:px-10 md:py-12 lg:grid-cols-[minmax(0,240px)_1fr] lg:items-start lg:gap-10 lg:px-12 xl:grid-cols-[minmax(0,260px)_1fr]">
          <RevealOnScroll>
            <div
              className={`mx-auto w-full max-w-[200px] rounded-xl border border-white/10 bg-[#111111] sm:max-w-[220px] md:max-w-[240px] lg:mx-0 lg:max-w-[260px] ${agentCardImageClassName}`}
            >
              <Image
                src={agentCardImageSrc(agent.slug)}
                alt={agent.cardImage?.alt ?? agent.name}
                fill
                priority
                className="object-contain object-top"
                sizes="(max-width: 640px) 200px, 260px"
              />
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={0.06}>
            <section className="flex h-full flex-col rounded-xl border border-white/10 bg-[#111111] p-6 md:p-8">
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-leanme-fuchsia">
                Carta d&apos;identità
              </h2>
              <div className="mt-5 flex-1">
                <IdentityRow label="Ruolo" value={profile.identity.role} />
                <IdentityRow
                  label="Ispirazione"
                  value={profile.identity.inspiration}
                />
                <IdentityRow
                  label="Principio guida"
                  value={profile.identity.guidingPrinciple}
                />
                <IdentityRow label="Missione" value={profile.identity.mission} />
                <IdentityRow label="Motto" value={profile.identity.motto} />
              </div>
            </section>
          </RevealOnScroll>
        </div>
      </section>

      <div className="mx-auto max-w-[1440px] px-5 py-10 md:px-10 md:py-14 lg:px-12">
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="space-y-6 lg:col-span-5">
            <ProfileSection title="Chi è">
              <div className="space-y-4">
                {profile.about.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 40)}
                    className="text-sm leading-relaxed text-white/75 md:text-base"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </ProfileSection>

            <ProfileSection title="Quando entra in azione" delay={0.05}>
              <BulletList items={profile.triggers} />
            </ProfileSection>

            <ProfileSection title="Valore per la squadra" delay={0.1}>
              <p className="text-sm leading-relaxed text-white/75 md:text-base">
                {profile.teamValue}
              </p>
            </ProfileSection>
          </div>

          <div className="space-y-6 lg:col-span-7">
            <ProfileSection title="Competenze principali" delay={0.04}>
              <ul className="grid gap-3 sm:grid-cols-2">
                {profile.competencies.map((competency) => (
                  <li
                    key={competency}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80"
                  >
                    {competency}
                  </li>
                ))}
              </ul>
            </ProfileSection>

            <ProfileSection title="Ecosistema — collabora con" delay={0.08}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {collaborators.map((collaborator) => (
                  <EcosystemCard
                    key={collaborator.slug}
                    name={collaborator.name}
                    role={collaborator.role}
                    imageSrc={collaborator.image.src}
                    imageAlt={collaborator.name}
                    href={`/staff-ibrido/lean-agent/${collaborator.slug}`}
                  />
                ))}
                {humanCollaborators.map((person) => (
                  <EcosystemCard
                    key={person.slug}
                    name={person.name}
                    role={person.role}
                    imageSrc={person.image.src}
                    imageAlt={person.image.alt}
                    href={`/chi-siamo/${person.slug}`}
                    badge="Collaboratore umano"
                  />
                ))}
                {networkSpecialists.map((specialist) => (
                  <EcosystemCard
                    key={specialist.slug}
                    name={specialist.name}
                    role={specialist.area}
                    imageAlt={specialist.name}
                    href={`/staff-ibrido#specialist-${specialist.slug}`}
                    badge="Network di specialisti"
                    initials={specialist.area.slice(0, 2)}
                  />
                ))}
                {profile.externalConnections?.map((connection) => (
                  <ExternalConnectionCard
                    key={connection.slug}
                    name={connection.name}
                  />
                ))}
              </div>
            </ProfileSection>

            <ProfileSection title="Il suo superpotere" delay={0.12}>
              <p className="text-lg font-medium leading-relaxed text-white md:text-xl">
                {profile.superpower}
              </p>
            </ProfileSection>
          </div>
        </div>

        <RevealOnScroll delay={0.14} className="mt-8">
          <section className="rounded-xl border border-white/10 bg-[#111111] p-6 md:p-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-leanme-fuchsia">
              Strumenti che utilizza
            </h2>
            <div className="mt-5 flex flex-wrap gap-3">
              {profile.tools.map((tool) => (
                <span
                  key={tool}
                  className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white/80"
                >
                  {tool}
                </span>
              ))}
            </div>
          </section>
        </RevealOnScroll>

        <RevealOnScroll delay={0.16} className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/chi-siamo"
            className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:border-white"
          >
            Chi siamo
          </Link>
          <Link
            href="/staff-ibrido"
            className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:border-white"
          >
            Staff Ibrido
          </Link>
          <Link
            href="/contatti"
            className="inline-flex items-center gap-2 rounded-full bg-leanme-fuchsia px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark"
          >
            Connect
            <ArrowIcon />
          </Link>
        </RevealOnScroll>
      </div>
    </div>
  );
}
