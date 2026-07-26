import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { roleToPersona } from "@/lib/auth/role-map";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({
      authenticated: false,
      persona: "public",
      isRegistered: false,
      isQualified: false,
      isGovernment: false,
      isAdmin: false,
      isSuperAdmin: false,
    });
  }

  return NextResponse.json({
    authenticated: true,
    userId: user.userId,
    email: user.email,
    name: user.name,
    role: user.role,
    persona: roleToPersona(user.role),
    organization: user.organization,
    ministryId: user.ministryId,
    ndaAcceptedAt: user.ndaAcceptedAt,
    notificationPrefs: user.notificationPrefs,
    avatarKey: user.avatarKey,
    jobTitle: user.jobTitle,
    phone: user.phone,
    hqAddress: user.hqAddress,
    businessRegistrationId: user.businessRegistrationId,
    websiteUrl: user.websiteUrl,
    isRegistered: user.isRegistered,
    isQualified: user.isQualified,
    isGovernment: user.isGovernment,
    isAdmin: user.isAdmin,
    isSuperAdmin: user.isSuperAdmin,
  });
}
