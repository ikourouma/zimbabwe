"use client";

import { useParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useProjectStore } from "@/context/project-store-context";
import { DealRoomAccessGate } from "@/components/deal-room/deal-room-access-gate";
import { QualificationRequiredNotice } from "@/components/deal-room/qualification-required-notice";
import { ProposeProjectWizard } from "@/components/deal-room/propose-project-wizard";
import { TeamAssignmentPicker } from "@/components/deal-room/team-assignment-picker";

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, isQualified, isLoading: authLoading, userId } = useAuth();
  const { getProject, isLoading: projectsLoading } = useProjectStore();

  if (!authLoading && !isAuthenticated) {
    return <DealRoomAccessGate isAuthenticated={isAuthenticated} />;
  }
  if (!authLoading && !isQualified) {
    return (
      <QualificationRequiredNotice
        feature="My Proposals"
        description="Propose your own projects into ZIDA's national pipeline once your investor profile is qualified."
      />
    );
  }

  const project = getProject(id);
  const isLoading = authLoading || projectsLoading;

  if (isLoading) {
    return <div className="dashboard-skeleton h-64 rounded-lg" />;
  }

  if (!project) {
    return (
      <div className="dashboard-panel p-6 text-center">
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Proposal not found.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">{project.title || "Untitled proposal"}</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Resume, edit, and submit your project proposal.
        </p>
      </div>
      <ProposeProjectWizard initial={project} />

      <div className="mt-6">
        <TeamAssignmentPicker projectId={project.id} isOwner={project.createdBy === userId} />
      </div>
    </div>
  );
}
