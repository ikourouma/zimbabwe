"use client";

import { useAuth } from "@/context/auth-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { GovernmentExecutiveReport } from "@/components/reports/government-executive-report";

export default function SuperAdminReportsPage() {
  const { isSuperAdmin, isLoading } = useAuth();

  if (!isLoading && !isSuperAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Use a super admin pilot account to generate the Government Executive Report."
      />
    );
  }

  return <GovernmentExecutiveReport />;
}
