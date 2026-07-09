/** Canonical site URL for metadata (OpenGraph, canonical links, sitemap, JSON-LD).
 *  Swap the fallback for the real production domain once one is assigned. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://zimbabwe.afronovation.com";

export const SITE_NAME = "Zimbabwe Digital Investment & Economic Intelligence Platform";
