"use client";

import { useAuth } from "@/context/auth-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { ProjectWizard } from "@/components/admin/project-wizard";

export default function SuperAdminNewProjectPage() {
  const { isSuperAdmin, isLoading: authLoading } = useAuth();

  if (!authLoading && !isSuperAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Sign in with a super admin account to register a new project."
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">New Project</h1>
        <p className="text-sm mt-1 max-w-2xl" style={{ color: "var(--color-text-secondary)" }}>
          Register a new opportunity into the Sovereign Project Registry. Save your progress at any point —
          nothing changes visibility until you submit it for review or publish it.
        </p>
      </div>
      <ProjectWizard basePath="/super-admin/projects" />
    </div>
  );
}
