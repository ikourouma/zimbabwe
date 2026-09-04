"use client";

import { useAuth } from "@/context/auth-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { MouRegistryView } from "@/components/dashboard/mou-registry-view";

export default function SuperAdminMouPage() {
  const { isSuperAdmin, isLoading: authLoading } = useAuth();

  if (!authLoading && !isSuperAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Sign in with a super admin account to govern the full MOU registry."
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">MOU Registry</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Platform-wide visibility into every Memorandum of Understanding, grouped by drafting/approval/signature stage.
        </p>
      </div>

      <MouRegistryView basePath="/super-admin/mou" />
    </div>
  );
}
