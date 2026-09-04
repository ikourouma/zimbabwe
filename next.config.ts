import type { NextConfig } from "next";

const PROTECTED_PREFIXES = ["/admin", "/super-admin", "/deal-room", "/ministry"] as const;

const nextConfig: NextConfig = {
  async headers() {
    return PROTECTED_PREFIXES.flatMap((prefix) => [
      {
        source: prefix,
        headers: [{ key: "Cache-Control", value: "private, no-store, must-revalidate" }],
      },
      {
        source: `${prefix}/:path*`,
        headers: [{ key: "Cache-Control", value: "private, no-store, must-revalidate" }],
      },
    ]);
  },
};

export default nextConfig;
