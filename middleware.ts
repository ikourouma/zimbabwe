import { auth } from "@/lib/auth/server";

// Proves authentication only ("is there a valid session") for the protected route prefixes
// below — this is the specific gap flagged in the Lesotho audit (middleware only checked
// "logged in?", not role). Role-level checks (which roles may actually enter each prefix) run
// server-side in each route's Server Component/Route Handler via lib/auth/session.ts's
// `requireRole()`, since the session here doesn't carry our custom `profiles.role` field — see
// PRODUCTION_MIGRATION_PLAN.md Phase 2. `proxy.ts` replaces `middleware.ts` in Next.js 16; this
// project is on Next.js 15, so `middleware.ts` is the correct filename per Neon's docs.
export default auth.middleware({
  loginUrl: "/auth/sign-in",
});

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/super-admin",
    "/super-admin/:path*",
    "/deal-room",
    "/deal-room/:path*",
    "/ministry",
    "/ministry/:path*",
  ],
};
