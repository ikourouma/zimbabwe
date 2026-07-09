import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config/site";

const DISALLOWED = ["/admin-demo", "/super-admin-demo"];

/** Known AI/answer-engine crawlers get an explicit allow — a zero-cost first step toward the
 *  broader AI-discoverability initiative tracked in BACKLOG.md. */
const AI_CRAWLERS = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "CCBot"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOWED },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/", disallow: DISALLOWED })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
