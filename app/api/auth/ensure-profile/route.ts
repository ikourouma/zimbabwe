import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { ensureProfileForUser } from "@/lib/auth/ensure-profile";

export async function POST() {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const profile = await ensureProfileForUser(session.user.id, { email: session.user.email });
  return NextResponse.json({ profile });
}
