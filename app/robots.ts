import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/lean-event", "/api/lean-event"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
