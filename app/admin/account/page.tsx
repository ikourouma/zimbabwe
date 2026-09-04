"use client";

import { useAuth } from "@/context/auth-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { AccountView } from "@/components/account/account-view";

export default function AdminAccountPage() {
  const { isAdmin, isLoading } = useAuth();

  if (!isLoading && !isAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Sign in with an admin account to manage your account and security settings."
      />
    );
  }

  return <AccountView />;
}
