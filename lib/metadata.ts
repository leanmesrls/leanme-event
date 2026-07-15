import type { Metadata } from "next";
import siteData from "@/data/site.json";
import type { SiteConfig } from "@/types/content";

const site = siteData as SiteConfig;

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? site.url ?? "https://leanme.it";

export function createPageMetadata({
  title,
  description,
  path = "",
  image = "/images/placeholders/og-default.svg",
  noIndex = false,
}: {
  title: string;
  description: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
}): Metadata {
  const url = `${SITE_URL}${path}`;
  const fullTitle = title.includes("LeanMe")
    ? title
    : `${title} | LeanMe`;

  return {
    title: fullTitle,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: site.name,
      locale: site.locale,
      type: "website",
      images: [
        {
          url: image.startsWith("http") ? image : `${SITE_URL}${image}`,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image.startsWith("http") ? image : `${SITE_URL}${image}`],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    keywords: site.seo.keywords,
  };
}

export function getDefaultMetadata(): Metadata {
  return {
    ...createPageMetadata({
      title: site.seo.defaultTitle,
      description: site.seo.defaultDescription,
      path: "",
    }),
    manifest: "/manifest.webmanifest",
  };
}
