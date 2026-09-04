"use client";

import { useAuth } from "@/context/auth-context";
import { DealRoomAccessGate } from "@/components/deal-room/deal-room-access-gate";
import { QualificationRequiredNotice } from "@/components/deal-room/qualification-required-notice";
import { CommunicationHubView } from "@/components/deal-room/communication-hub-view";

export default function DealRoomCommunicationPage() {
  const { isAuthenticated, isQualified, isLoading } = useAuth();

  if (!isLoading && !isAuthenticated) {
    return <DealRoomAccessGate isAuthenticated={isAuthenticated} />;
  }
  if (!isLoading && !isQualified) {
    return (
      <QualificationRequiredNotice
        feature="Communication Hub"
        description="Message ZIDA and project stakeholders directly once your investor profile is qualified."
      />
    );
  }

  return <CommunicationHubView />;
}
