"use client";

import { useAuth } from "@/context/auth-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { ReviewQueueView } from "@/components/dashboard/review-queue-view";

/** Thin alias of the Admin Unified Review Queue so Super Admin does not have to switch consoles. */
export default function SuperAdminReviewQueuePage() {
  const { isAdmin, isLoading: authLoading } = useAuth();

  if (!authLoading && !isAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Use a super admin account to review submissions, amendments, and association requests."
      />
    );
  }

  return <ReviewQueueView />;
}
