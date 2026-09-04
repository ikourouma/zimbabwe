import { auth } from "@/lib/auth/server";

// Authentication only. Console role access is enforced server-side by guardConsoleLayout()
// in app/*/layout.tsx. Do not resolve the role here by fetching /api/me: Edge middleware can
// only reach it through the public origin, and on Hostinger that self-request through LiteSpeed
// throws, which turns every matched console route into a 500.
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
