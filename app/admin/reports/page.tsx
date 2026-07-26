"use client";

import { useAuth } from "@/context/auth-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { GovernmentExecutiveReport } from "@/components/reports/government-executive-report";

export default function AdminReportsPage() {
  const { isAdmin, isLoading } = useAuth();

  if (!isLoading && !isAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Use an admin pilot account to generate the Government Executive Report."
      />
    );
  }

  return <GovernmentExecutiveReport />;
}
