"use client";

import { useAuth } from "@/context/auth-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { CommunicationHubView } from "@/components/deal-room/communication-hub-view";

export default function AdminCommunicationPage() {
  const { isAdmin, isLoading } = useAuth();

  if (!isLoading && !isAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Sign in with an admin account to read and reply to investor questions."
      />
    );
  }

  return <CommunicationHubView />;
}
