"use client";

import { useAuth } from "@/context/auth-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { ProjectRegistryView } from "@/components/dashboard/project-registry-view";

export default function AdminProjectsPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();

  if (!authLoading && !isAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Use an admin pilot account to create, browse, and review projects in the registry."
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Projects</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Master Sovereign Project Registry. Filter by governance status, review data rooms, or execute administrative overrides.
        </p>
      </div>

      <ProjectRegistryView basePath="/admin/projects" />
    </div>
  );
}
