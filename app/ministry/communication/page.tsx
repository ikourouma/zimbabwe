"use client";

import { useAuth } from "@/context/auth-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { CommunicationHubView } from "@/components/deal-room/communication-hub-view";

/**
 * Ministry-scoped Communication Hub (Ministry Desk management dashboard plan, Part 3) — read +
 * reply across every project/engagement thread on the ministry_admin's own ministry's projects.
 * CommunicationHubView already scopes its data (useCommunicationHub → GET /api/messages, ministry-
 * scoped server-side for this role) and swaps in the ministry project picker for "New Message".
 */
export default function MinistryCommunicationPage() {
  const { isMinistryAdmin, isLoading } = useAuth();

  if (!isLoading && !isMinistryAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Use a Ministry Admin account to read and reply to messages on your ministry's projects."
      />
    );
  }

  return <CommunicationHubView />;
}
