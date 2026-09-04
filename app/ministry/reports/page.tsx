"use client";

import { useAuth } from "@/context/auth-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { PersonalActivityReport } from "@/components/reports/personal-activity-report";

/**
 * Ministry Desk Reports (Platform Feedback Batch v3, Phase 1) — mirrors /deal-room/reports's
 * "My Activity Summary" tab so ministry_admin has full console-admin-at-ministry-level parity.
 * Reuses PersonalActivityReport as-is: it already scopes "My Engagements" to the viewer's own
 * ministryId when isMinistryAdmin (or isGovernment) is true, so no separate ministry-report
 * component is needed here.
 */
export default function MinistryReportsPage() {
  const { isAuthenticated, isMinistryAdmin, isLoading } = useAuth();

  if (!isLoading && (!isAuthenticated || !isMinistryAdmin)) {
    return (
      <AccessGate
        title="Sign in required"
        description="Use a Ministry Admin account to view your ministry's activity report."
      />
    );
  }

  return <PersonalActivityReport />;
}
