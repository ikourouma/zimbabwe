"use client";

import { useAuth } from "@/context/auth-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { ProjectRegistryView } from "@/components/dashboard/project-registry-view";

export default function MinistryProjectsPage() {
  const { isMinistryAdmin, isLoading: authLoading } = useAuth();

  if (!authLoading && !isMinistryAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Use a Ministry Admin account to view your ministry's project pipeline."
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Ministry Pipeline</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Your ministry&apos;s own projects show by default — toggle off &quot;My Ministry Only&quot; below to browse the
          full national pipeline for context. Either way, you can only create, edit, and advance projects where your
          ministry is the <strong className="text-white">primary</strong> beneficiary; everything else stays read-only.
        </p>
      </div>

      <ProjectRegistryView basePath="/ministry/projects" />
    </div>
  );
}
