import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { accreditationDocuments } from "@/lib/db/schema";
import { getSignedDownloadUrl, isR2Configured } from "@/lib/storage/r2";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign-in required" }, { status: 401 });
    const { id } = await params;
    const [row] = await db.select().from(accreditationDocuments).where(eq(accreditationDocuments.id, id)).limit(1);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (row.userId !== user.userId && !user.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!isR2Configured()) return NextResponse.json({ error: "File storage is not configured" }, { status: 503 });
    const url = await getSignedDownloadUrl(row.storageKey, row.fileName, 300, "inline");
    return NextResponse.redirect(url, 307);
  } catch (error) {
    return handleRouteError(error);
  }
}
