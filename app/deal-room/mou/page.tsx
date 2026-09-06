"use client";

import { useAuth } from "@/context/auth-context";
import { DealRoomAccessGate } from "@/components/deal-room/deal-room-access-gate";
import { QualificationRequiredNotice } from "@/components/deal-room/qualification-required-notice";
import { MouRegistryView } from "@/components/dashboard/mou-registry-view";

export default function DealRoomMouPage() {
  const { isAuthenticated, isQualified, role, isLoading: authLoading } = useAuth();

  // Government reviewers and staff share this console with investors, but the memoranda they see
  // are other parties' — describing them as "your own engagements" reads as though a reviewer had
  // a commercial interest in the documents they approve.
  const isOversight = role === "government" || role === "admin" || role === "super_admin";

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
          {isOversight
            ? "Every Memorandum of Understanding on the engagements you oversee, grouped by drafting/approval/signature stage."
            : "Every Memorandum of Understanding tied to your own engagements, grouped by drafting/approval/signature stage."}
        </p>
      </div>

      <MouRegistryView basePath="/deal-room/mou" />
    </div>
  );
}
