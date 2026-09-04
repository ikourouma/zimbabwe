"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import type { LeadInquiry } from "@/lib/types";

/**
 * Companion to RegisteredWelcomePanel (Investor Qualification Vetting plan) — surfaces the
 * signed-in applicant's own "changes requested" Strategic Partnerships application, if any, with
 * the staff reviewer's note and a direct link back into the wizard, which resumes from their
 * saved draft (see GET /api/inquiries/draft). Renders nothing for every other case: no
 * application, still pending, already decided, or not signed in.
 */
export function ApplicationStatusBanner() {
  const { isAuthenticated, isLoading } = useAuth();
  const [inquiry, setInquiry] = useState<LeadInquiry | null>(null);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    let cancelled = false;
    fetch("/api/inquiries/draft")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: LeadInquiry | null) => {
        if (!cancelled) setInquiry(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isLoading, isAuthenticated]);

  if (inquiry?.status !== "changes_requested") return null;

  return (
    <div
      className="mb-8 rounded-lg border-l-4 border p-5"
      style={{
        borderLeftColor: "#fbbf24",
        borderColor: "rgba(251, 191, 36, 0.35)",
        backgroundColor: "rgba(251, 191, 36, 0.08)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "rgba(251, 191, 36, 0.18)" }}
        >
          <AlertCircle className="h-4 w-4" style={{ color: "#92700a" }} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zim-green-900 mb-1">
            More information needed on your application
          </p>
          {inquiry.reviewNotes && (
            <p className="text-sm text-zim-muted mb-3">&ldquo;{inquiry.reviewNotes}&rdquo;</p>
          )}
          <Link href="/strategic-partnerships" className="btn-sovereign text-xs px-4 py-2 whitespace-nowrap inline-flex">
            Resume Application
          </Link>
        </div>
      </div>
    </div>
  );
}
