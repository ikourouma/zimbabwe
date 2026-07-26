import { NextResponse } from "next/server";
import { AuthorizationError } from "@/lib/auth/session";

export function handleRouteError(error: unknown) {
  if (error instanceof AuthorizationError) {
    const status =
      error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" ? 403 : 403;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
