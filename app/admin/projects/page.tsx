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
        description="Sign in with an admin account to create, browse, and review projects in the registry."
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Projects</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          {/* Overrides are a Platform Admin capability, exercised at /super-admin/override — a ZIDA
              Admin advances projects through the workflow rather than overriding it, and promising
              otherwise describes authority this console does not hold. */}
          Master Sovereign Project Registry. Filter by governance status, review data rooms, and advance
          proposals through the national review workflow.
        </p>
      </div>

      <ProjectRegistryView basePath="/admin/projects" />
    </div>
  );
}
