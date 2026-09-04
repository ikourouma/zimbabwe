"use client";

import { useAuth } from "@/context/auth-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { TeamRosterView } from "@/components/account/team-roster-view";

/** Dedicated Team page for ministry_admin (Team Ministry Traceability Batch, Phase 4) — same
 *  roster/bulk-invite component the Deal Room console uses, "ministry" copy instead of
 *  "organization" (see approveOrgInvite's role-mirroring for why the underlying pipeline is
 *  identical). */
export default function MinistryTeamsPage() {
  const { isMinistryAdmin, isLoading: authLoading } = useAuth();

  if (!authLoading && !isMinistryAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Use a Ministry Admin account to manage your ministry's team."
      />
    );
  }

  return <TeamRosterView entityLabel="ministry" />;
}
