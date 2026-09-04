import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Public, indexable routes only. Authenticated routes (dashboard, documents,
 * upload, ask, compare, timeline, settings) are intentionally excluded.
 */
const PUBLIC_ROUTES = ["/", "/about", "/contact", "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
