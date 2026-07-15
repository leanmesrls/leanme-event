import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AgentCard } from "@/components/lean-agent/AgentCard";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { getStaffData } from "@/lib/content";
import type { HomepageData } from "@/types/content";

interface LeanAgentTeamSectionProps {
  data: HomepageData["leanAgentTeam"];
}

export function LeanAgentTeamSection({ data }: LeanAgentTeamSectionProps) {
  const staff = getStaffData();

  return (
    <section id={data.id} className="section-padding bg-leanme-gray-50">
      <Container>
        <SectionHeading
          title={data.title}
          subtitle={data.subtitle}
          description={data.description}
        />
        <div className="mt-16 grid items-start gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {staff.leanAgents.map((agent, index) => (
            <RevealOnScroll key={agent.slug} delay={index * 0.08}>
              <AgentCard agent={agent} />
            </RevealOnScroll>
          ))}
        </div>
        <div className="mt-10">
          <Link
            href="/staff-ibrido"
            className="text-sm font-medium text-leanme-purple transition-colors hover:text-leanme-black"
          >
            Scopri lo Staff Ibrido →
          </Link>
        </div>
      </Container>
    </section>
  );
}
