import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";
import { consoleFromPathname, consolesForRole } from "@/lib/auth/console-access";
import { getPostLoginDestination } from "@/lib/auth/post-login-destination";

const authMiddleware = auth.middleware({
  loginUrl: "/auth/sign-in",
});

// Proves authentication first, then enforces console role access. The layout guard in
// app/*/layout.tsx is a second line of defence, but it silently failed for /ministry in
// production (wrong-role users received HTTP 200) while middleware is proven to run.
// Role comes from /api/me because Edge middleware cannot use the Node-only pg driver.
export default async function middleware(request: NextRequest) {
  const authResponse = await authMiddleware(request);

  if (authResponse.status >= 300 && authResponse.status < 400) {
    return authResponse;
  }

  const activeConsole = consoleFromPathname(request.nextUrl.pathname);
  if (!activeConsole) {
    return authResponse;
  }

  const meRes = await fetch(new URL("/api/me", request.nextUrl.origin), {
    headers: { cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store",
  });

  if (!meRes.ok) {
    return authResponse;
  }

  const me = (await meRes.json()) as {
    authenticated?: boolean;
    role?: string;
    isSuperAdmin?: boolean;
    isAdmin?: boolean;
    isMinistryAdmin?: boolean;
    isQualified?: boolean;
  };

  if (!me.authenticated) {
    return NextResponse.redirect(new URL("/auth/sign-in", request.nextUrl.origin));
  }

  if (!consolesForRole(me.role as Parameters<typeof consolesForRole>[0]).includes(activeConsole)) {
    const destination = getPostLoginDestination(me);
    return NextResponse.redirect(new URL(destination, request.nextUrl.origin));
  }

  return authResponse;
}

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
