"use client";

import { useAuth } from "@/context/auth-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { MouRegistryView } from "@/components/dashboard/mou-registry-view";

export default function MinistryMouPage() {
  const { isMinistryAdmin, isLoading: authLoading } = useAuth();

  if (!authLoading && !isMinistryAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Use a Ministry Admin account to review MOUs tied to your ministry's projects."
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">MOU Registry</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Memoranda of Understanding for engagements tied to your ministry&apos;s projects, grouped by drafting/approval/signature stage.
        </p>
      </div>

      <MouRegistryView basePath="/ministry/mou" />
    </div>
  );
}
