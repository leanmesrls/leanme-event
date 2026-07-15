import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/metadata";
import {
  getAllAcademyResourceSlugs,
  getAllChiSiamoPersonSlugs,
  getAllLeanAgentSlugs,
  getAllLeanLabArticleSlugs,
  getAllLeanLabCategorySlugs,
  getAllPercorsoSlugs,
  getSiteConfig,
} from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSiteConfig();
  const baseUrl = SITE_URL;

  const staticRoutes = site.navigation.map((item) => ({
    url: `${baseUrl}${item.href === "/" ? "" : item.href}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: item.href === "/" ? 1 : 0.8,
  }));

  const percorsoRoutes = getAllPercorsoSlugs().map((slug) => ({
    url: `${baseUrl}/come-possiamo-aiutarti/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const agentRoutes = getAllLeanAgentSlugs().map((slug) => ({
    url: `${baseUrl}/staff-ibrido/lean-agent/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const chiSiamoProfileRoutes = getAllChiSiamoPersonSlugs().map((slug) => ({
    url: `${baseUrl}/chi-siamo/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const categoryRoutes = getAllLeanLabCategorySlugs().map((slug) => ({
    url: `${baseUrl}/leanlab/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const articleRoutes = getAllLeanLabArticleSlugs().map((slug) => ({
    url: `${baseUrl}/leanlab/articolo/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const academyRoutes = getAllAcademyResourceSlugs().map((slug) => ({
    url: `${baseUrl}/lean-academy/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const newsletterRoute = {
    url: `${baseUrl}/newsletter`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  };

  const prenotaConsulenzaRoute = {
    url: `${baseUrl}/prenota-consulenza`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  };

  const legalRoutes = [
    "/privacy",
    "/privacy-newsletter",
    "/cookie",
    "/accessibilita",
    "/credits",
  ].map((path) => ({
      url: `${baseUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })
  );

  return [
    ...staticRoutes,
    newsletterRoute,
    prenotaConsulenzaRoute,
    ...legalRoutes,
    ...percorsoRoutes,
    ...chiSiamoProfileRoutes,
    ...agentRoutes,
    ...categoryRoutes,
    ...articleRoutes,
    ...academyRoutes,
  ];
}
