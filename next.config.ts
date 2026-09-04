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
