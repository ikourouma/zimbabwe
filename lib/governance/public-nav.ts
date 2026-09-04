/** Canonical public-header nav hrefs that Super Admin can hide from SiteHeader (and matching
 *  footer links). Pages stay reachable by direct URL — this is a nav-visibility toggle, not an
 *  access control. Keys are hrefs so i18n label changes never desync the setting. */
export const PUBLIC_NAV_HREFS = [
  "/opportunity",
  "/platform",
  "/strategic-alignment",
  "/sectors",
  "/projects",
  "/about-afronovation",
  "/strategic-partnerships",
  "/faq",
  "/investor-journey",
  "/zimbabwe",
  "/contact",
] as const;

export type PublicNavHref = (typeof PUBLIC_NAV_HREFS)[number];

export type PublicNavVisibility = Record<PublicNavHref, boolean>;

export const PUBLIC_NAV_ADMIN_LABELS: Record<PublicNavHref, string> = {
  "/opportunity": "Opportunity",
  "/platform": "Platform",
  "/strategic-alignment": "Strategic Pillars",
  "/sectors": "Sectors",
  "/projects": "Projects",
  "/about-afronovation": "Afronovation",
  "/strategic-partnerships": "Strategic Inquiries",
  "/faq": "FAQs",
  "/investor-journey": "Investor Journey",
  "/zimbabwe": "National Profile",
  "/contact": "Contact",
};

export const DEFAULT_PUBLIC_NAV_VISIBILITY: PublicNavVisibility = {
  "/opportunity": true,
  "/platform": true,
  "/strategic-alignment": true,
  "/sectors": true,
  "/projects": true,
  "/about-afronovation": true,
  "/strategic-partnerships": true,
  "/faq": true,
  "/investor-journey": true,
  "/zimbabwe": true,
  "/contact": true,
};

export function mergePublicNavVisibility(raw: unknown): PublicNavVisibility {
  const merged: PublicNavVisibility = { ...DEFAULT_PUBLIC_NAV_VISIBILITY };
  if (!raw || typeof raw !== "object") return merged;
  const record = raw as Record<string, unknown>;
  for (const href of PUBLIC_NAV_HREFS) {
    if (typeof record[href] === "boolean") merged[href] = record[href];
  }
  return merged;
}

export function isPublicNavHrefVisible(href: string, visibility: PublicNavVisibility): boolean {
  if ((PUBLIC_NAV_HREFS as readonly string[]).includes(href)) {
    return visibility[href as PublicNavHref] !== false;
  }
  return true;
}
