"use client";

import { useAuth } from "@/context/auth-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { AccountView } from "@/components/account/account-view";

export default function SuperAdminAccountPage() {
  const { isSuperAdmin, isLoading } = useAuth();

  if (!isLoading && !isSuperAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Sign in with a super admin account to manage your account and security settings."
      />
    );
  }

  return <AccountView />;
}
