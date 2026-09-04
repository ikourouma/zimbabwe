"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Clock, MessageSquareWarning, XCircle } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import type { ApplicationState } from "@/lib/hooks/use-application-state";

/**
 * Investor Dashboard Overview's onboarding checklist — supersedes the one-time dismissible
 * RegisteredWelcomePanel/ApplicationStatusBanner (still shown on /projects too) with a persistent
 * status readout now that /deal-room is the investor's actual home (Investor Dashboard Expansion
 * plan). Hidden entirely once both steps are complete.
 *
 * Application state is now fetched once by the caller via useApplicationState() and passed in —
 * DealRoomOverview needs the same state to decide whether to show the QualificationBanner, so
 * this card no longer owns its own fetch (Qualified Investor banner + pilot closeout plan).
 */
export function GettingStartedCard({
  appState,
  reviewNotes,
}: {
  appState: ApplicationState;
  reviewNotes: string | null;
}) {
  const { organization, phone } = useAuth();
  const profileComplete = Boolean(organization && phone);

  if (profileComplete && appState === "qualified") return null;
  if (appState === "loading") return null;

  return (
    <div className="dashboard-panel p-5 mb-6">
      <h2 className="text-sm font-semibold text-white mb-4">Getting Started</h2>
      <ul className="space-y-3">
        <li className="flex items-start gap-3">
          {profileComplete ? (
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#4ade80" }} />
          ) : (
            <Circle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--color-text-muted)" }} />
          )}
          <div className="min-w-0">
            <p className="text-sm text-white">Complete your profile</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {profileComplete ? "Organization and contact details on file." : "Add your organization and phone number."}
            </p>
            {!profileComplete && (
              <Link href="/deal-room/profile" className="text-xs underline" style={{ color: "var(--color-gold)" }}>
                Update profile
              </Link>
            )}
          </div>
        </li>
        <li className="flex items-start gap-3">
          {appState === "qualified" || appState === "approved" ? (
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#4ade80" }} />
          ) : appState === "changes_requested" ? (
            <MessageSquareWarning className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#fde047" }} />
          ) : appState === "declined" ? (
            <XCircle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#f87171" }} />
          ) : appState === "pending" ? (
            <Clock className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--color-gold)" }} />
          ) : (
            <Circle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--color-text-muted)" }} />
          )}
          <div className="min-w-0">
            <p className="text-sm text-white">Complete your investment profile</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {(appState === "qualified" || appState === "approved") &&
                "You're a Qualified Investor — full Deal Room access unlocked."}
              {appState === "pending" && "Submitted — under review by ZIDA."}
              {appState === "changes_requested" &&
                (reviewNotes ? `Changes requested: "${reviewNotes}"` : "ZIDA has requested changes to your application.")}
              {appState === "declined" &&
                (reviewNotes ? `Application declined: "${reviewNotes}"` : "ZIDA has declined this application.")}
              {appState === "draft" && "In progress — resume where you left off."}
              {appState === "not_started" &&
                "Apply to become a Qualified Investor to unlock Engagements, Communication Hub, and proposing your own projects."}
            </p>
            {appState !== "qualified" && appState !== "approved" && appState !== "pending" && (
              <Link
                href={appState === "not_started" || appState === "declined" ? "/deal-room/profile" : "/strategic-partnerships"}
                className="text-xs underline"
                style={{ color: "var(--color-gold)" }}
              >
                {appState === "draft" || appState === "changes_requested"
                  ? "Resume application"
                  : appState === "declined"
                    ? "Submit a new application"
                    : "Start application"}
              </Link>
            )}
          </div>
        </li>
      </ul>
    </div>
  );
}
