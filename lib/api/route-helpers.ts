import { NextResponse } from "next/server";
import { AuthorizationError } from "@/lib/auth/session";

/** A business-rule violation with an explicit HTTP status, for query-layer functions that need to
 *  signal something more specific than "500 Internal Server Error" (e.g. "already decided" → 400,
 *  "not found" → 404) without importing NextResponse into lib/db/queries/*. Thrown from the query
 *  layer, translated back to a real status code here. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function handleRouteError(error: unknown) {
  if (error instanceof AuthorizationError) {
    const status =
      error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" ? 403 : 403;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
