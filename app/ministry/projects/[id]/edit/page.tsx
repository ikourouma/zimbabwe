"use client";

import { useParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useProjectStore } from "@/context/project-store-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { ProjectWizard } from "@/components/admin/project-wizard";

export default function MinistryEditProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { isMinistryAdmin, ministryId, isLoading: authLoading } = useAuth();
  const { getProject, isLoading: projectsLoading } = useProjectStore();

  if (!authLoading && !isMinistryAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Use a Ministry Admin account to edit your ministry's projects."
      />
    );
  }

  const isLoading = authLoading || projectsLoading;
  if (isLoading) {
    return <div className="dashboard-skeleton h-64 rounded-lg" />;
  }

  const project = getProject(id);
  if (!project) {
    return (
      <div className="dashboard-panel p-6 text-center">
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Project not found.
        </p>
      </div>
    );
  }

  // Read-only for a secondary-beneficiary project — full edit rights are primary-ministry-only
  // (see resolveProjectWorkflowRole; the server re-checks this on every PATCH regardless).
  if (project.primaryBeneficiaryMinistryId !== ministryId) {
    return (
      <div className="dashboard-panel p-6 text-center">
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          You can only edit projects where your ministry is the primary beneficiary. This project lists your
          ministry only as a co-sponsoring (secondary) beneficiary.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">{project.title || "Untitled project"}</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Edit any field at any lifecycle stage. Edits to live projects require a reason.
        </p>
      </div>
      <ProjectWizard basePath="/ministry/projects" initial={project} lockedMinistryId={ministryId ?? undefined} />
    </div>
  );
}
