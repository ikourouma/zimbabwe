"use client";

import { useAuth } from "@/context/auth-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { ProjectWizard } from "@/components/admin/project-wizard";

export default function MinistryNewProjectPage() {
  const { isMinistryAdmin, ministryId, isLoading: authLoading } = useAuth();

  if (!authLoading && !isMinistryAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Use a Ministry Admin account to register a new project for your ministry."
      />
    );
  }

  if (!authLoading && !ministryId) {
    return (
      <div className="dashboard-panel p-6 text-center">
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          No ministry is assigned to your account yet. Contact a Platform/ZIDA Admin to complete your setup before
          registering projects.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">New Project</h1>
        <p className="text-sm mt-1 max-w-2xl" style={{ color: "var(--color-text-secondary)" }}>
          Register a new opportunity on behalf of your ministry. Save your progress at any point — nothing
          changes visibility until you submit it for review or publish it.
        </p>
      </div>
      <ProjectWizard basePath="/ministry/projects" lockedMinistryId={ministryId ?? undefined} />
    </div>
  );
}
