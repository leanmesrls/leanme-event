import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/leanyou", "/api/leanyou"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
