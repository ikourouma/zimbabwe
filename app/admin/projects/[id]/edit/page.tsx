"use client";

import { useParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useProjectStore } from "@/context/project-store-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { ProjectWizard } from "@/components/admin/project-wizard";

export default function AdminEditProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { getProject, isLoading: projectsLoading } = useProjectStore();

  if (!authLoading && !isAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Sign in with an admin account to edit projects in the registry."
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">{project.title || "Untitled project"}</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Edit any field at any lifecycle stage. Edits to live projects require a reason.
        </p>
      </div>
      <ProjectWizard basePath="/admin/projects" initial={project} />
    </div>
  );
}
