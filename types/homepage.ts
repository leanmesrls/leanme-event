export interface HomeNavItem {
  label: string;
  href: string;
  children?: HomeNavItem[];
}

export interface HomeCta {
  label: string;
  href: string;
}

export interface HomeAgent {
  slug: string;
  name: string;
  role: string;
  action: string;
  actionColor: string;
  image: string;
  href: string;
}

export interface HomeService {
  slug: string;
  icon: string;
  title: string;
  description: string;
  href: string;
}

export interface HomeLabTab {
  id: string;
  label: string;
  category: string;
}

export interface HomepageData {
  headerCta: HomeCta;
  headerNavigation: HomeNavItem[];
  hero: {
    claimPrimary: string;
    claimAccent: string;
    headlinePrefix: string;
    headlineAccent: string;
    subheadline: string;
    paragraphs: string[];
    primaryCta: HomeCta;
    secondaryCta: HomeCta;
    background: string;
  };
  leanAgentAi: {
    title: string;
    intro: string[];
    footerLink: HomeCta;
    agents: HomeAgent[];
  };
  services: {
    title: string;
    items: HomeService[];
    linkLabel: string;
  };
  leanLab: {
    title: string;
    viewAll: HomeCta;
    newsletter: HomeCta;
    tabs: HomeLabTab[];
  };
  leanAcademy: {
    title: string;
    tagline: string;
    description: string;
    cta: HomeCta;
  };
  testimonials: {
    title: string;
  };
  partners: {
    title: string;
    items: Array<{ name: string; logo: string; alt: string }>;
  };
  contactBanner: {
    title: string;
    description: string;
    cta: HomeCta;
  };
  footer: {
    description: string;
    servicesTitle: string;
    contactsTitle: string;
    credits: string;
  };
}
