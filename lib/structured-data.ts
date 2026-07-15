import { SITE_URL } from "@/lib/metadata";
import siteData from "@/data/site.json";
import { ASSETS } from "@/lib/assets";
import type { SiteConfig } from "@/types/content";

const site = siteData as SiteConfig;
const OFFICIAL_LOGO = `${SITE_URL}${ASSETS.logo.default}`;

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: site.company,
    alternateName: site.name,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: OFFICIAL_LOGO,
      width: 1500,
      height: 1000,
    },
    image: OFFICIAL_LOGO,
    description: site.seo.defaultDescription,
    slogan: site.claim,
    sameAs: site.footer.social.map((s) => s.href),
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["Italian"],
      url: `${SITE_URL}/contatti`,
    },
    knowsAbout: [
      "Azienda Ibrida",
      "Intelligenza Artificiale",
      "Automazione",
      "Trasformazione Digitale",
      "Healthcare",
    ],
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: site.name,
    url: SITE_URL,
    description: site.seo.defaultDescription,
    inLanguage: site.language,
    publisher: {
      "@id": `${SITE_URL}/#organization`,
    },
  };
}

export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export function homepageSchema({
  description,
  services,
  agents,
}: {
  description: string;
  services: Array<{ name: string; description: string; url: string }>;
  agents: Array<{ name: string; role: string; url: string }>;
}) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      url: SITE_URL,
      name: site.seo.defaultTitle,
      description,
      inLanguage: site.language,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: `${SITE_URL}${ASSETS.hero.reception}`,
      },
      speakable: {
        "@type": "SpeakableSpecification",
        cssSelector: ["#hero-heading", "#lean-agent-heading", "#services-heading"],
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Percorsi LeanMe",
      itemListElement: services.map((service, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Service",
          name: service.name,
          description: service.description,
          url: service.url,
          provider: { "@id": `${SITE_URL}/#organization` },
        },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Lean.Agent — Staff Ibrido AI",
      description:
        "Agenti AI specializzati che completano lo staff ibrido LeanMe: pianificazione, ricerca, comunicazione, formazione, workflow, sviluppo e assistenza.",
      itemListElement: agents.map((agent, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Thing",
          name: agent.name,
          description: agent.role,
          url: agent.url,
        },
      })),
    },
    breadcrumbSchema([{ name: "Home", path: "/" }]),
  ];
}

export function articleSchema(article: {
  title: string;
  description: string;
  path: string;
  datePublished: string;
  author: string;
  image: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.datePublished,
    author: {
      "@type": "Organization",
      name: article.author,
    },
    image: article.image.startsWith("http")
      ? article.image
      : `${SITE_URL}${article.image}`,
    publisher: {
      "@type": "Organization",
      name: site.company,
      logo: {
        "@type": "ImageObject",
        url: OFFICIAL_LOGO,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}${article.path}`,
    },
  };
}

export function serviceSchema(service: {
  name: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.description,
    provider: {
      "@id": `${SITE_URL}/#organization`,
    },
    url: `${SITE_URL}${service.path}`,
  };
}

export function faqPageSchema(
  faqs: Array<{ question: string; answer: string }>,
  path: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
    url: `${SITE_URL}${path}`,
  };
}

export function personSchema(person: {
  name: string;
  jobTitle: string;
  description: string;
  path: string;
  image?: string;
  knowsAbout?: string[];
  alumniOf?: string;
  honorificPrefix?: string;
}) {
  const personId = `${SITE_URL}${person.path}#person`;

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": personId,
    name: person.name,
    ...(person.honorificPrefix
      ? { honorificPrefix: person.honorificPrefix }
      : {}),
    jobTitle: person.jobTitle,
    description: person.description,
    url: `${SITE_URL}${person.path}`,
    ...(person.image
      ? {
          image: person.image.startsWith("http")
            ? person.image
            : `${SITE_URL}${person.image}`,
        }
      : {}),
    worksFor: {
      "@id": `${SITE_URL}/#organization`,
    },
    ...(person.knowsAbout?.length
      ? { knowsAbout: person.knowsAbout }
      : {}),
    ...(person.alumniOf ? { alumniOf: person.alumniOf } : {}),
  };
}

export function leanAgentPersonSchema(agent: {
  name: string;
  role: string;
  description: string;
  path: string;
  image?: string;
  competencies?: string[];
  specialty?: string;
}) {
  return personSchema({
    name: agent.name,
    jobTitle: `Lean.Agent — ${agent.role}`,
    description: agent.description,
    path: agent.path,
    image: agent.image,
    knowsAbout: [
      "Intelligenza Artificiale",
      "Azienda Ibrida",
      agent.specialty ?? agent.role,
      ...(agent.competencies ?? []).slice(0, 6),
    ],
  });
}

export function localBusinessSchema(contact: {
  name: string;
  description: string;
  telephone: string;
  email: string;
  legalAddress: { lines: string[] };
  operationalAddress: { lines: string[] };
  social: Array<{ href: string }>;
  mapUrl: string;
}) {
  const operationalStreet = contact.operationalAddress.lines.slice(1).join(", ");
  const legalStreet = contact.legalAddress.lines.slice(1).join(", ");

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/contatti#localbusiness`,
    name: contact.name,
    description: contact.description,
    url: `${SITE_URL}/contatti`,
    telephone: contact.telephone,
    email: contact.email,
    image: OFFICIAL_LOGO,
    address: {
      "@type": "PostalAddress",
      streetAddress: operationalStreet,
      addressLocality: "Bologna",
      addressRegion: "BO",
      postalCode: "40135",
      addressCountry: "IT",
    },
    legalName: contact.legalAddress.lines[0],
    ...(legalStreet !== operationalStreet
      ? {
          additionalProperty: {
            "@type": "PropertyValue",
            name: "Sede legale",
            value: `${contact.legalAddress.lines.join(", ")}`,
          },
        }
      : {}),
    geo: {
      "@type": "GeoCoordinates",
      latitude: 44.4949,
      longitude: 11.3426,
    },
    hasMap: contact.mapUrl,
    sameAs: contact.social.map((s) => s.href),
    parentOrganization: {
      "@id": `${SITE_URL}/#organization`,
    },
  };
}
