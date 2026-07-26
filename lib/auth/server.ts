import { createNeonAuth } from "@neondatabase/auth/next/server";

// `next build` (Next.js's "Collecting page data" step) imports every route module — including
// this one, transitively, via app/api/auth/[...path]/route.ts — even for routes nothing calls
// yet. A hard throw here for missing env vars would break that build (including the live
// Hostinger build, which has none of these set, per PRODUCTION_MIGRATION_PLAN.md). So we fall
// back to an obviously-fake placeholder at import time; any *real* auth call made against it
// (sign-in, getSession, etc.) fails at request time with a clear upstream NETWORK_DNS-style
// error instead, which is the appropriate place for this to surface.
const baseUrl = process.env.NEON_AUTH_BASE_URL ?? "https://unset-neon-auth-base-url.invalid/auth";
const cookieSecret =
  process.env.NEON_AUTH_COOKIE_SECRET ?? "unset-neon-auth-cookie-secret-placeholder-32-chars-min";

/**
 * Single server-side auth instance — `.handler()` for the catch-all API route,
 * `.middleware()` for the authentication gate in middleware.ts, `.getSession()` everywhere else
 * (Server Components, Server Actions, Route Handlers).
 *
 * Pilot note: disable mandatory email verification in the Neon Console (Auth settings) until
 * Phase 5 — see PRODUCTION_MIGRATION_PLAN.md "Email verification — deferred decision".
 *
 * This only proves *authentication* ("is there a valid session"). Role-level *authorization*
 * ("is this session's role allowed here") is layered on top via lib/auth/session.ts, which
 * joins the session to our own `profiles` table — Managed Better Auth's session doesn't carry
 * our custom `role` field, so that check happens where a DB call is cheap (Server
 * Components/Route Handlers), not inside edge middleware. See PRODUCTION_MIGRATION_PLAN.md
 * Phase 2's authorization-hardening notes for the rationale.
 */
export const auth = createNeonAuth({
  baseUrl,
  cookies: {
    secret: cookieSecret,
  },
});
