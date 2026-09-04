import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Authenticated application routes are disallowed so private user data is
 * never crawled. Public marketing/trust routes stay crawlable.
 */
const PRIVATE_PREFIXES = [
  "/dashboard",
  "/documents",
  "/upload",
  "/timeline",
  "/ask",
  "/compare",
  "/settings",
  "/reset-password",
  "/auth/",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: PRIVATE_PREFIXES,
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
