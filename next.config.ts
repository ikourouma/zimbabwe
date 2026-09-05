import type { NextConfig } from "next";

const PROTECTED_PREFIXES = ["/admin", "/super-admin", "/deal-room", "/ministry"] as const;

// Cache-Control reaches the client intact and no-store is what actually stops a shared cache
// from serving one user's console to another. Vary: Cookie is kept as correct-by-the-spec
// belt-and-braces, but LiteSpeed's compression overwrites it with Accept-Encoding on the
// Hostinger deploy, so nothing (including the smoke test) may depend on observing it.
const PROTECTED_HEADERS = [
  { key: "Cache-Control", value: "private, no-store, must-revalidate" },
  { key: "Vary", value: "Cookie" },
];

// Next's default for a fully prerendered page is s-maxage=31536000, Hostinger's CDN honours it, and
// nothing purges on deploy. A released fix can therefore keep serving the previous build's
// fingerprinted JS indefinitely: on 2026-09-05 a page cached before a deploy was still handed out
// 33 minutes after it, on a cache HIT, referencing pre-fix chunks. /api/version reported the new
// commit throughout, because that route is dynamic while the page shell is not — so the deployed
// commit is not evidence that users are running it.
//
// A minute of shared-cache lifetime still absorbs traffic bursts, and stale-while-revalidate keeps
// the edge answering instantly while it refreshes behind the request. Console routes are excluded
// because PROTECTED_HEADERS already sets no-store on them, and Next appends rather than replaces —
// two Cache-Control headers on one response is worse than either alone.
const PAGE_CACHE_MATCHER =
  "/((?!_next/static|_next/image|api/|admin|super-admin|deal-room|ministry).*)";
const PAGE_CACHE_HEADERS = [
  { key: "Cache-Control", value: "public, max-age=0, s-maxage=60, stale-while-revalidate=300" },
];

const nextConfig: NextConfig = {
  // Both the apex and www served 200 independently, so the platform had two live canonical URLs.
  // NEXT_PUBLIC_SITE_URL, every transactional email link, and the stakeholder walkthrough guides
  // all use the apex, so www folds into it rather than the other way around.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.zidaproject.com" }],
        destination: "https://zidaproject.com/:path*",
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      ...PROTECTED_PREFIXES.flatMap((prefix) => [
        {
          source: prefix,
          headers: PROTECTED_HEADERS,
        },
        {
          source: `${prefix}/:path*`,
          headers: PROTECTED_HEADERS,
        },
      ]),
      {
        source: PAGE_CACHE_MATCHER,
        headers: PAGE_CACHE_HEADERS,
      },
    ];
  },
};

export default nextConfig;
