"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Clock, MessageSquareWarning } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import type { LeadInquiry } from "@/lib/types";

type ApplicationState = "loading" | "not_started" | "draft" | "pending" | "changes_requested" | "qualified";

/**
 * Investor Dashboard Overview's onboarding checklist — supersedes the one-time dismissible
 * RegisteredWelcomePanel/ApplicationStatusBanner (still shown on /projects too) with a persistent
 * status readout now that /deal-room is the investor's actual home (Investor Dashboard Expansion
 * plan). Hidden entirely once both steps are complete.
 */
export function GettingStartedCard() {
  const { isQualified, organization, phone } = useAuth();
  const [appState, setAppState] = useState<ApplicationState>("loading");
  const [reviewNotes, setReviewNotes] = useState<string | null>(null);

  useEffect(() => {
    if (isQualified) {
      setAppState("qualified");
      return;
    }
    let cancelled = false;
    fetch("/api/inquiries/draft")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: LeadInquiry | null) => {
        if (cancelled) return;
        if (!data) setAppState("not_started");
        else if (data.status === "changes_requested") {
          setAppState("changes_requested");
          setReviewNotes(data.reviewNotes ?? null);
        } else if (data.status === "pending") setAppState("pending");
        else setAppState("draft");
      })
      .catch(() => setAppState("not_started"));
    return () => {
      cancelled = true;
    };
  }, [isQualified]);

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
          {appState === "qualified" ? (
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#4ade80" }} />
          ) : appState === "changes_requested" ? (
            <MessageSquareWarning className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#fde047" }} />
          ) : appState === "pending" ? (
            <Clock className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--color-gold)" }} />
          ) : (
            <Circle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--color-text-muted)" }} />
          )}
          <div className="min-w-0">
            <p className="text-sm text-white">Complete your investment profile</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {appState === "qualified" && "You're a Qualified Investor — full Deal Room access unlocked."}
              {appState === "pending" && "Submitted — under review by ZIDA."}
              {appState === "changes_requested" &&
                (reviewNotes ? `Changes requested: "${reviewNotes}"` : "ZIDA has requested changes to your application.")}
              {appState === "draft" && "In progress — resume where you left off."}
              {appState === "not_started" && "Apply to become a Qualified Investor to unlock Engagements, Communication Hub, and proposing your own projects."}
            </p>
            {appState !== "qualified" && appState !== "pending" && (
              <Link
                href={appState === "not_started" ? "/deal-room/profile" : "/strategic-partnerships"}
                className="text-xs underline"
                style={{ color: "var(--color-gold)" }}
              >
                {appState === "draft" || appState === "changes_requested" ? "Resume application" : "Start application"}
              </Link>
            )}
          </div>
        </li>
      </ul>
    </div>
  );
}
