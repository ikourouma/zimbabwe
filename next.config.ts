import type { NextConfig } from "next";

const PROTECTED_PREFIXES = ["/admin", "/super-admin", "/deal-room", "/ministry"] as const;

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
