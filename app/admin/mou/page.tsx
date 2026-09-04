"use client";

import { useAuth } from "@/context/auth-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { MouRegistryView } from "@/components/dashboard/mou-registry-view";

export default function AdminMouPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();

  if (!authLoading && !isAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Sign in with an admin account to review Memoranda of Understanding across the pipeline."
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">MOU Registry</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Every Memorandum of Understanding across the pipeline, grouped by drafting/approval/signature stage.
        </p>
      </div>

      <MouRegistryView basePath="/admin/mou" />
    </div>
  );
}
