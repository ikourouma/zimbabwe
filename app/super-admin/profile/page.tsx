"use client";

import { useAuth } from "@/context/auth-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { ProfileView } from "@/components/account/profile-view";

export default function SuperAdminProfilePage() {
  const { isSuperAdmin, isLoading } = useAuth();

  if (!isLoading && !isSuperAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Sign in with a super admin account to view your profile."
      />
    );
  }

  return <ProfileView />;
}
