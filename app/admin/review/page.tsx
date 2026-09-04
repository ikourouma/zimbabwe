"use client";

import { useAuth } from "@/context/auth-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { ReviewQueueView } from "@/components/dashboard/review-queue-view";

/**
 * Unified Review Queue (Platform Feedback Batch v4, Phase 7) — one surface covering both systems
 * that used to be split across this page and the Communication Hub's action cards: new
 * submissions moving through the workflow, and pending `project_amendment_request` cards. See
 * ReviewQueueView for the full implementation; also reachable by super_admin via the console
 * switcher into the Admin Console (no separate /super-admin/review page exists).
 */
export default function AdminReviewQueuePage() {
  const { isAdmin, isLoading: authLoading } = useAuth();

  if (!authLoading && !isAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Sign in with an admin or super admin account to review and action submitted projects."
      />
    );
  }

  return <ReviewQueueView />;
}
