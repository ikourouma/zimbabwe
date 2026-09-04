"use client";

import { useAuth } from "@/context/auth-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { ReviewQueueView } from "@/components/dashboard/review-queue-view";

/**
 * Ministry Desk Review Queue (Platform Feedback Batch v4, Phase 8) — the ministry-scoped
 * counterpart of /admin/review. Same ReviewQueueView: New Submissions (this ministry's
 * in-flight projects) plus Pending Requests (government-filed amendment cards still
 * awaiting this ministry_admin's stage-1 decision). Approve escalates to ZIDA; Decline
 * is terminal. Publish stays admin/super_admin-only.
 */
export default function MinistryReviewQueuePage() {
  const { isMinistryAdmin, isLoading: authLoading } = useAuth();

  if (!authLoading && !isMinistryAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Use a Ministry Admin account to review your ministry's submissions and government amendment requests."
      />
    );
  }

  return <ReviewQueueView />;
}
