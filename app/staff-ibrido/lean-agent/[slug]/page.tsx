import { notFound } from "next/navigation";

import { LeanAgentProfile } from "@/components/lean-agent/LeanAgentProfile";
import { VisibleBreadcrumb } from "@/components/layout/VisibleBreadcrumb";
import {
  getAllLeanAgentSlugs,
  getLeanAgentBySlug,
  getStaffData,
} from "@/lib/content";
import { createPageMetadata } from "@/lib/metadata";
import {
  breadcrumbSchema,
  leanAgentPersonSchema,
} from "@/lib/structured-data";
import { JsonLd } from "@/components/seo/JsonLd";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllLeanAgentSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const agent = getLeanAgentBySlug(slug);

  if (!agent) {
    return createPageMetadata({
      title: "Lean.Agent non trovato",
      description: "L'agente richiesto non esiste.",
      path: `/staff-ibrido/lean-agent/${slug}`,
      noIndex: true,
    });
  }

  return createPageMetadata({
    title: agent.name,
    description: agent.description,
    path: `/staff-ibrido/lean-agent/${slug}`,
    image: agent.cardImage.src,
  });
}

export default async function LeanAgentPage({ params }: PageProps) {
  const { slug } = await params;
  const agent = getLeanAgentBySlug(slug);

  if (!agent) {
    notFound();
  }

  const path = `/staff-ibrido/lean-agent/${slug}`;
  if (!agent.profile) {
    notFound();
  }

  const breadcrumbItems = [
    { name: "Home", path: "/" },
    { name: "Lo Staff Ibrido", path: "/staff-ibrido" },
    { name: agent.name, path },
  ];

  const collaborators = agent.profile.collaborators
    .map((collaboratorSlug) =>
      getStaffData().leanAgents.find((item) => item.slug === collaboratorSlug)
    )
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const humanCollaborators = getStaffData().people;
  const networkSpecialists = getStaffData().network.specialists;

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema(breadcrumbItems),
          leanAgentPersonSchema({
            name: agent.name,
            role: agent.profile.identity.role,
            description: agent.description,
            path,
            image: agent.cardImage.src,
            competencies: agent.profile.competencies,
            specialty: agent.specialty,
          }),
        ]}
      />
      <VisibleBreadcrumb items={breadcrumbItems} />
      <LeanAgentProfile
        agent={agent}
        collaborators={collaborators}
        humanCollaborators={humanCollaborators}
        networkSpecialists={networkSpecialists}
      />
    </>
  );
}
