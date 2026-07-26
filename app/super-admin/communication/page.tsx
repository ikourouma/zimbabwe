"use client";

import { useAuth } from "@/context/auth-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { CommunicationHubView } from "@/components/deal-room/communication-hub-view";

export default function SuperAdminCommunicationPage() {
  const { isSuperAdmin, isLoading } = useAuth();

  if (!isLoading && !isSuperAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Use a super admin pilot account to read and reply to investor questions."
      />
    );
  }

  return <CommunicationHubView />;
}
