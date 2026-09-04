"use client";

import { useAuth } from "@/context/auth-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { ProfileView } from "@/components/account/profile-view";

export default function AdminProfilePage() {
  const { isAdmin, isLoading } = useAuth();

  if (!isLoading && !isAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Sign in with an admin account to view your profile."
      />
    );
  }

  return <ProfileView />;
}
