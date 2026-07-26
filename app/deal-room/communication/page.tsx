"use client";

import { useAuth } from "@/context/auth-context";
import { DealRoomAccessGate } from "@/components/deal-room/deal-room-access-gate";
import { CommunicationHubView } from "@/components/deal-room/communication-hub-view";

export default function DealRoomCommunicationPage() {
  const { isQualified, isAuthenticated, isLoading } = useAuth();

  if (!isLoading && !isQualified) {
    return <DealRoomAccessGate isAuthenticated={isAuthenticated} />;
  }

  return <CommunicationHubView />;
}
