"use client";

import { useAuth } from "@/context/auth-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { ProfileView } from "@/components/account/profile-view";

export default function MinistryProfilePage() {
  const { isMinistryAdmin, isLoading } = useAuth();

  if (!isLoading && !isMinistryAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Use a Ministry Admin account to view your profile."
      />
    );
  }

  return <ProfileView />;
}
