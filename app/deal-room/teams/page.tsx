"use client";

import { useAuth } from "@/context/auth-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { DealRoomAccessGate } from "@/components/deal-room/deal-room-access-gate";
import { TeamRosterView } from "@/components/account/team-roster-view";

/** Dedicated Team page for qualified investors (Team Ministry Traceability Batch, Phase 4, item
 *  3) — promoted out of /deal-room/profile's small "My Team" panel. Qualified-and-up only (a
 *  `registered` investor has no org to invite teammates into yet). `government` is deliberately
 *  excluded (Platform Feedback Batch v3, Phase 1) — they have no org-invite rights server-side
 *  (org_invites is owner-scoped to qualified/ministry_admin only) and reviewing this page for them
 *  was a latent nav-gate bug, not an intended entitlement. */
export default function DealRoomTeamsPage() {
  const { isAuthenticated, role, isLoading: authLoading } = useAuth();

  if (!authLoading && !isAuthenticated) {
    return <DealRoomAccessGate isAuthenticated={isAuthenticated} />;
  }
  if (!authLoading && role === "registered") {
    return (
      <div className="mx-auto max-w-md text-center py-16">
        <h2 className="text-lg font-semibold text-white mb-2">Qualify first</h2>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Team invites open up once your investor profile is qualified. See My Profile to check your qualification
          status.
        </p>
      </div>
    );
  }
  if (!authLoading && role !== "qualified" && role !== "admin" && role !== "super_admin") {
    return (
      <AccessGate
        title="Access denied"
        description="Team roster is available to qualified investors and platform administrators."
      />
    );
  }

  return <TeamRosterView entityLabel="organization" />;
}
