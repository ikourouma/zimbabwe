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
    return PROTECTED_PREFIXES.flatMap((prefix) => [
      {
        source: prefix,
        headers: PROTECTED_HEADERS,
      },
      {
        source: `${prefix}/:path*`,
        headers: PROTECTED_HEADERS,
      },
    ]);
  },
};

export default nextConfig;
