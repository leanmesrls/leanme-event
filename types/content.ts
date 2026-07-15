export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

export interface SocialLink {
  label: string;
  href: string;
  platform: string;
}

export interface SiteConfig {
  name: string;
  company: string;
  claim: string;
  claimSecondary: string;
  url: string;
  locale: string;
  language: string;
  navigation: NavItem[];
  footer: {
    tagline: string;
    copyright: string;
    social: SocialLink[];
    legalLinks: NavItem[];
  };
  seo: {
    defaultTitle: string;
    titleTemplate: string;
    defaultDescription: string;
    keywords: string[];
  };
}

export interface CTA {
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "ghost";
}

export interface ImageAsset {
  src: string;
  alt: string;
  replaceHint: string;
  width?: number;
  height?: number;
}

export interface SectionBase {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface PercorsoVignette {
  id: string;
  image: ImageAsset;
  width?: number;
  height?: number;
  displayScale?: number;
}

export interface Percorso {
  slug: string;
  title: string;
  shortDescription: string;
  description: string | string[];
  icon: string;
  image: ImageAsset;
  services?: string[];
  vignettes?: PercorsoVignette[];
  vignetteArrowBetween?: boolean;
  leanLabTag?: string;
  faq?: FaqItem[];
  inPocheParole?: string[];
}

export interface LeanAgentProfile {
  title: string;
  tagline: string[];
  quote: string;
  about: string[];
  identity: {
    role: string;
    inspiration: string;
    guidingPrinciple: string;
    mission: string;
    motto: string;
  };
  competencies: string[];
  triggers: string[];
  collaborators: string[];
  externalConnections?: Array<{ slug: string; name: string }>;
  superpower: string;
  teamValue: string;
  tools: string[];
}

export interface LeanAgent {
  slug: string;
  name: string;
  role: string;
  specialty: string;
  action?: string;
  actionColor?: string;
  description: string;
  image: ImageAsset;
  cardImage: ImageAsset;
  profile?: LeanAgentProfile;
}

export interface TeamMember {
  slug: string;
  name: string;
  role: string;
  description: string;
  image: ImageAsset;
}

export interface Specialist {
  slug: string;
  name: string;
  area: string;
  description: string;
}

export interface StaffData {
  intro: SectionBase;
  people: TeamMember[];
  leanAgents: LeanAgent[];
  network: {
    title: string;
    description: string;
    specialists: Specialist[];
  };
}

export interface LeanLabCategory {
  slug: string;
  title: string;
  description: string;
}

export interface LeanLabArticle {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  image: ImageAsset;
  author: string;
  tags?: string[];
}

export interface LeanLabPageData {
  pageIntro: {
    subtitle: string;
    descriptions: string[];
  };
  intro: {
    sections: Array<{
      title: string;
      content: string[];
    }>;
  };
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  quote: string;
  image?: ImageAsset;
}

export interface AcademyResource {
  slug: string;
  title: string;
  type: string;
  description: string;
  image: ImageAsset;
  href: string;
}

export interface AcademyData {
  intro: SectionBase;
  publicArea: {
    title: string;
    description: string;
    resources: AcademyResource[];
  };
  reservedArea: {
    title: string;
    description: string;
    features: string[];
  };
}

export interface ContactData {
  intro: SectionBase;
  introBlocks: string[];
  legalAddress: {
    label: string;
    lines: string[];
  };
  operationalAddress: {
    label: string;
    lines: string[];
  };
  phone: {
    label: string;
    value: string;
    href: string;
  };
  email: {
    label: string;
    value: string;
    href: string;
  };
  social: SocialLink[];
  map: {
    embedUrl: string;
    label: string;
  };
  foundation: {
    title: string;
    description: string;
    sectionTitle?: string;
    donateLabel?: string;
    donateUrl?: string;
  };
  piva?: {
    label: string;
    value: string;
  };
  pec?: {
    label: string;
    value: string;
    href: string;
  };
  sdi?: {
    label: string;
    value: string;
  };
  form: {
    title: string;
    description: string;
    submitLabel: string;
    iframeId?: string;
    iframeSrc?: string;
    embedHandlerOrigin?: string;
  };
}

export interface NewsletterData {
  intro: {
    title: string;
    subtitle: string;
  };
  introBlocks: string[];
  form: {
    iframeId: string;
    title: string;
    src: string;
    embedHandlerOrigin: string;
  };
}

export interface PrenotaConsulenzaData {
  intro: {
    title: string;
    subtitle: string;
  };
  introBlocks: string[];
  form: {
    iframeId: string;
    title: string;
    src: string;
    embedHandlerOrigin: string;
  };
}

export interface PercorsiConsultationCta {
  label: string;
  href: string;
}

export interface ChiSiamoPanel {
  id: string;
  image: string;
  alt: string;
}

export interface ChiSiamoTeamMember {
  slug: string;
  name: string;
  role?: string;
  image: string;
  cta?: { label: string; href: string };
}

export interface ChiSiamoPersonProfile {
  quote?: string;
  identity: {
    title: string;
    background: string;
    path: string;
    experience: string;
    focus: string;
  };
  pillars: string[];
  sections: Array<{
    id: string;
    title: string;
    paragraphs: string[];
  }>;
  surprise?: {
    title: string;
    paragraphs: string[];
    image?: string;
    imageAlt?: string;
  };
  accentImage?: {
    src: string;
    alt: string;
  };
}

export interface ChiSiamoPerson {
  slug: string;
  name: string;
  role: string;
  tagline: string;
  bio: string[];
  image: string;
  profile?: ChiSiamoPersonProfile;
}

export interface ChiSiamoData {
  intro: SectionBase;
  hero: {
    background: string;
    imageAlt: string;
  };
  comic: {
    row1: ChiSiamoPanel[];
    row3: ChiSiamoPanel[];
    row4: ChiSiamoPanel[];
  };
  teaser: {
    text: string;
  };
  team: {
    members: ChiSiamoTeamMember[];
  };
  manifesto: {
    title: string;
    content: string[];
  };
  people: Record<string, ChiSiamoPerson>;
}

export interface HomepageSection {
  id: string;
  enabled: boolean;
}

export interface HomepageData {
  hero: {
    title: string;
    subtitle: string;
    claim: string;
    description: string;
    image: ImageAsset;
    primaryCta: CTA;
    secondaryCta: CTA;
  };
  humanAi: SectionBase & {
    content: string[];
    image: ImageAsset;
    cta: CTA;
  };
  percorsiTrasformazione: SectionBase & {
    items: Array<{
      title: string;
      description: string;
      icon: string;
    }>;
  };
  soluzioniSuMisura: SectionBase & {
    items: Array<{
      title: string;
      description: string;
      image: ImageAsset;
    }>;
  };
  metodoLeanMe: SectionBase & {
    steps: Array<{
      number: string;
      title: string;
      description: string;
    }>;
  };
  leanAgentTeam: SectionBase & {
    description: string;
  };
  leanLab: SectionBase & {
    description: string;
    cta: CTA;
  };
  caseStudies: SectionBase & {
    items: Array<{
      title: string;
      client: string;
      description: string;
      image: ImageAsset;
      href: string;
    }>;
    cta: CTA;
  };
  cta: SectionBase & {
    primaryCta: CTA;
    secondaryCta: CTA;
  };
}

export interface CaseStudy {
  slug: string;
  title: string;
  client: string;
  description: string;
  image: ImageAsset;
  results: string[];
}

export interface LegalDocumentSubsection {
  title: string;
  paragraphs: string[];
}

export interface LegalDocumentSection {
  id: string;
  title: string;
  paragraphs?: string[];
  footerParagraphs?: string[];
  subsections?: LegalDocumentSubsection[];
  lines?: string[];
  items?: string[];
  email?: string;
  embedPlaceholder?: string;
}

export interface LegalDocumentData {
  hero: {
    title: string;
    subtitle?: string;
    lastUpdated: string;
  };
  sections: LegalDocumentSection[];
}

export interface CreditsMember {
  name: string;
  role: string;
  description: string;
}

export interface CreditsData {
  hero: {
    title: string;
    subtitle: string;
  };
  intro: string[];
  people: {
    title: string;
    members: CreditsMember[];
  };
  agents: {
    title: string;
    members: CreditsMember[];
  };
  technologies: {
    title: string;
    intro: string;
    items: string[];
    footer: string;
  };
}
