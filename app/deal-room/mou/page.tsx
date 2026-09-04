"use client";

import { useAuth } from "@/context/auth-context";
import { DealRoomAccessGate } from "@/components/deal-room/deal-room-access-gate";
import { QualificationRequiredNotice } from "@/components/deal-room/qualification-required-notice";
import { MouRegistryView } from "@/components/dashboard/mou-registry-view";

export default function DealRoomMouPage() {
  const { isAuthenticated, isQualified, isLoading: authLoading } = useAuth();

  if (!authLoading && !isAuthenticated) {
    return <DealRoomAccessGate isAuthenticated={isAuthenticated} />;
  }
  if (!authLoading && !isQualified) {
    return (
      <QualificationRequiredNotice
        feature="MOU Registry"
        description="Track your Memoranda of Understanding across every active engagement once your investor profile is qualified."
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">MOU Registry</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Every Memorandum of Understanding tied to your own engagements, grouped by drafting/approval/signature stage.
        </p>
      </div>

      <MouRegistryView basePath="/deal-room/mou" />
    </div>
  );
}
