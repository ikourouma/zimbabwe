"use client";

import { useAuth } from "@/context/auth-context";
import { DealRoomAccessGate } from "@/components/deal-room/deal-room-access-gate";
import { QualificationRequiredNotice } from "@/components/deal-room/qualification-required-notice";
import { ProposeProjectWizard } from "@/components/deal-room/propose-project-wizard";

export default function NewProposalPage() {
  const { isAuthenticated, isQualified, isLoading } = useAuth();

  if (!isLoading && !isAuthenticated) {
    return <DealRoomAccessGate isAuthenticated={isAuthenticated} />;
  }
  if (!isLoading && !isQualified) {
    return (
      <QualificationRequiredNotice
        feature="Propose a Project"
        description="Submit your own project idea into ZIDA's national pipeline once your investor profile is qualified."
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Propose a Project</h1>
        <p className="text-sm mt-1 max-w-2xl" style={{ color: "var(--color-text-secondary)" }}>
          Submit a new investment opportunity for ZIDA review. Save your progress at any point — nothing is
          visible to ZIDA until you submit it for review.
        </p>
      </div>
      <ProposeProjectWizard />
    </div>
  );
}
