"use client";

import { useAuth } from "@/context/auth-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { ProjectRegistryView } from "@/components/dashboard/project-registry-view";

export default function SuperAdminProjectsPage() {
  const { isSuperAdmin, isLoading: authLoading } = useAuth();

  if (!authLoading && !isSuperAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Sign in with a super admin account to browse and govern the full project registry."
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Project Registry</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Master Sovereign Project Registry. Filter by governance status, review data rooms, or execute administrative overrides.
        </p>
      </div>

      <ProjectRegistryView basePath="/super-admin/projects" />
    </div>
  );
}
