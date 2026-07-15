import siteData from "@/data/site.json";
import homepageData from "@/data/homepage.json";
import percorsiData from "@/data/percorsi.json";
import chiSiamoData from "@/data/chi-siamo.json";
import staffData from "@/data/staff.json";
import leanLabCategories from "@/data/leanlab/categories.json";
import leanLabArticles from "@/data/leanlab/articles.json";
import leanLabPageData from "@/data/leanlab/page.json";
import testimonialsData from "@/data/testimonials.json";
import academyData from "@/data/academy.json";
import contattiData from "@/data/contatti.json";
import diconoDiNoiData from "@/data/dicono-di-noi.json";
import newsletterData from "@/data/newsletter.json";
import prenotaConsulenzaData from "@/data/prenota-consulenza.json";
import privacyData from "@/data/privacy.json";
import privacyNewsletterData from "@/data/privacy-newsletter.json";
import cookieData from "@/data/cookie.json";
import accessibilityData from "@/data/accessibility.json";
import creditsData from "@/data/credits.json";
import seoContentData from "@/data/seo-content.json";

import type {
  AcademyData,
  ChiSiamoData,
  ContactData,
  LegalDocumentData,
  CreditsData,
  NewsletterData,
  PrenotaConsulenzaData,
  PercorsiConsultationCta,
  LeanLabArticle,
  LeanLabCategory,
  LeanLabPageData,
  Percorso,
  FaqItem,
  SiteConfig,
  StaffData,
  Testimonial,
} from "@/types/content";
import type { HomepageData } from "@/types/homepage";
import type { PartnerLogo } from "@/lib/companies";
import { getPartnerLogos as readPartnerLogos } from "@/lib/companies";

export function getSiteConfig(): SiteConfig {
  return siteData as SiteConfig;
}

export function getHomepageData(): HomepageData {
  return homepageData as HomepageData;
}

export function getPercorsiData(): {
  intro: {
    id: string;
    title: string;
    subtitle?: string;
    description?: string | string[];
  };
  consultationCta: PercorsiConsultationCta;
  percorsi: Percorso[];
} {
  return percorsiData as {
    intro: {
      id: string;
      title: string;
      subtitle?: string;
      description?: string | string[];
    };
    consultationCta: PercorsiConsultationCta;
    percorsi: Percorso[];
  };
}

export function getPercorsoBySlug(slug: string): Percorso | undefined {
  return getPercorsiData().percorsi.find((p) => p.slug === slug);
}

export function getChiSiamoData(): ChiSiamoData {
  return chiSiamoData as ChiSiamoData;
}

export function getChiSiamoPersonBySlug(slug: string) {
  return getChiSiamoData().people[slug];
}

export function getAllChiSiamoPersonSlugs(): string[] {
  return Object.keys(getChiSiamoData().people);
}

export function getStaffData(): StaffData {
  return staffData as StaffData;
}

export function getLeanAgentBySlug(slug: string) {
  return getStaffData().leanAgents.find((a) => a.slug === slug);
}

export function getLeanLabCategories(): LeanLabCategory[] {
  return leanLabCategories as LeanLabCategory[];
}

export function getLeanLabArticles(): LeanLabArticle[] {
  return leanLabArticles as LeanLabArticle[];
}

export function getLeanLabPageData(): LeanLabPageData {
  return leanLabPageData as LeanLabPageData;
}

export function getLeanLabArticlesByCategory(categorySlug: string): LeanLabArticle[] {
  return getLeanLabArticles().filter((a) => a.category === categorySlug);
}

export function getLeanLabArticlesByTag(tag: string): LeanLabArticle[] {
  return getLeanLabArticles().filter((a) => a.tags?.includes(tag));
}

export function getLeanLabArticle(slug: string): LeanLabArticle | undefined {
  return getLeanLabArticles().find((a) => a.slug === slug);
}

export function getLeanLabCategory(slug: string): LeanLabCategory | undefined {
  return getLeanLabCategories().find((c) => c.slug === slug);
}

export function getTestimonials(): Testimonial[] {
  return testimonialsData as Testimonial[];
}

export function getAcademyData(): AcademyData {
  return academyData as AcademyData;
}

export function getContattiData(): ContactData {
  return contattiData as ContactData;
}

export function getNewsletterData(): NewsletterData {
  return newsletterData as NewsletterData;
}

export function getPrenotaConsulenzaData(): PrenotaConsulenzaData {
  return prenotaConsulenzaData as PrenotaConsulenzaData;
}

export function getPrivacyData(): LegalDocumentData {
  return privacyData as LegalDocumentData;
}

export function getPrivacyNewsletterData(): LegalDocumentData {
  return privacyNewsletterData as LegalDocumentData;
}

export function getCookiePolicyData(): LegalDocumentData {
  return cookieData as LegalDocumentData;
}

export function getAccessibilityData(): LegalDocumentData {
  return accessibilityData as LegalDocumentData;
}

export function getCreditsData(): CreditsData {
  return creditsData as CreditsData;
}

export function getDiconoDiNoiData(): {
  intro: { title: string; subtitle: string };
} {
  return diconoDiNoiData;
}

export function getPartnerLogos(): PartnerLogo[] {
  return readPartnerLogos();
}

export function getAllPercorsoSlugs(): string[] {
  return getPercorsiData().percorsi.map((p) => p.slug);
}

export function getAllLeanAgentSlugs(): string[] {
  return getStaffData().leanAgents.map((a) => a.slug);
}

export function getAllLeanLabCategorySlugs(): string[] {
  return getLeanLabCategories().map((c) => c.slug);
}

export function getAllLeanLabArticleSlugs(): string[] {
  return getLeanLabArticles().map((a) => a.slug);
}

export function getAllAcademyResourceSlugs(): string[] {
  return getAcademyData().publicArea.resources.map((r) => r.slug);
}

type SeoContentData = {
  hub: {
    path: string;
    faq: FaqItem[];
    inPocheParole: string[];
  };
  pages: Record<string, { inPocheParole: string[] }>;
};

export function getSeoContentData(): SeoContentData {
  return seoContentData as SeoContentData;
}

export function getSeoHubFaq(): FaqItem[] {
  return getSeoContentData().hub.faq;
}

export function getSeoHubInPocheParole(): string[] {
  return getSeoContentData().hub.inPocheParole;
}

export function getSeoInPocheParole(path: string): string[] {
  return getSeoContentData().pages[path]?.inPocheParole ?? [];
}
