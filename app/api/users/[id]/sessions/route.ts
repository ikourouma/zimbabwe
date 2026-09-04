import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { auth } from "@/lib/auth/server";

type RouteParams = { params: Promise<{ id: string }> };

type SessionRow = {
  token?: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  updatedAt?: string | Date | null;
  createdAt?: string | Date | null;
};

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    await requireRole(["admin", "super_admin"]);
    const { id } = await params;
    const authAny = auth as unknown as {
      listUserSessions?: (args: { userId: string }) => Promise<{ data?: SessionRow[]; error?: { message?: string } }>;
      admin?: {
        listUserSessions?: (args: { userId: string }) => Promise<{ data?: SessionRow[]; error?: { message?: string } }>;
      };
    };
    const fn = authAny.listUserSessions ?? authAny.admin?.listUserSessions;
    if (!fn) {
      return NextResponse.json({ error: "Session telemetry is not available on this auth adapter." }, { status: 501 });
    }
    const res = await fn({ userId: id });
    if (res?.error) {
      return NextResponse.json({ error: res.error.message ?? "Could not load sessions" }, { status: 502 });
    }
    const rows = (res?.data ?? []).map((s) => ({
      userAgent: s.userAgent ?? null,
      ipAddress: s.ipAddress ?? null,
      updatedAt: s.updatedAt ? new Date(s.updatedAt).toISOString() : null,
      createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : null,
    }));
    return NextResponse.json(rows);
  } catch (error) {
    return handleRouteError(error);
  }
}
