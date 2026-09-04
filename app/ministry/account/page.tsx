"use client";

import { useAuth } from "@/context/auth-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { AccountView } from "@/components/account/account-view";

export default function MinistryAccountPage() {
  const { isMinistryAdmin, isLoading } = useAuth();

  if (!isLoading && !isMinistryAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Use a Ministry Admin account to manage your account and security settings."
      />
    );
  }

  return <AccountView />;
}
