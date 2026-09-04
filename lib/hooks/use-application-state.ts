"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import type { LeadInquiry } from "@/lib/types";

export type ApplicationState =
  | "loading"
  | "not_started"
  | "draft"
  | "pending"
  | "changes_requested"
  | "approved"
  | "declined"
  | "qualified";

interface DraftStateResponse {
  draft: LeadInquiry | null;
  latestStatus: LeadInquiry["status"] | null;
  reviewNotes: string | null;
}

/**
 * Single source of truth for "where is my Qualified Investor application" — lifted out of
 * GettingStartedCard so the /deal-room overview banner (which needs the same state to decide
 * whether to show the on-ramp at all) doesn't fetch it a second time. Reads the envelope GET
 * /api/inquiries/draft now returns, so — unlike the old draft-only lookup — this can actually
 * distinguish `pending`/`approved`/`declined` from `not_started` (application-state blind spot
 * fix), instead of every submitted application quietly reading as if it had never begun.
 */
export function useApplicationState() {
  const { isQualified } = useAuth();
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
      .then((data: DraftStateResponse | null) => {
        if (cancelled) return;
        setReviewNotes(data?.reviewNotes ?? null);
        setAppState((data?.latestStatus as ApplicationState | null) ?? "not_started");
      })
      .catch(() => {
        if (!cancelled) setAppState("not_started");
      });
    return () => {
      cancelled = true;
    };
  }, [isQualified]);

  return { appState, reviewNotes };
}
