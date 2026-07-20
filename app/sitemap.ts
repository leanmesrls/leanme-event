import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/metadata";
import { leanEventLoginPath } from "@/lib/lean-event/paths";

/** Solo entry login — prodotto SaaS, noindex via robots. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}${leanEventLoginPath()}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
