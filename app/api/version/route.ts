import { NextResponse } from "next/server";
import { BUILD_INFO } from "@/lib/config/build-info";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(BUILD_INFO, {
    headers: { "Cache-Control": "no-store" },
  });
}
