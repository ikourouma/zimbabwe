"use client";

import { useState } from "react";
import { useLeadCapture } from "@/context/lead-capture-context";

/**
 * Shown when the inquiry list could not be read, in place of the empty state.
 *
 * The distinction matters more than it looks: while GET /api/inquiries was returning 500, every
 * inquiry console rendered "No Qualified Investor applications yet." — an answer that is
 * indistinguishable from a genuinely quiet queue, and one a reviewer has no reason to question.
 */
export function InquiryLoadError() {
  const { refresh } = useLeadCapture();
  const [retrying, setRetrying] = useState(false);

  return (
    <div className="dashboard-panel p-10 text-center">
      <p className="text-sm text-white">This queue could not be loaded.</p>
      <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
        The list is unavailable rather than empty, so applications may be waiting. Retry, and report
        this if it persists.
      </p>
      <button
        type="button"
        disabled={retrying}
        onClick={async () => {
          setRetrying(true);
          await refresh();
          setRetrying(false);
        }}
        className="mt-4 rounded px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60"
        style={{ border: "1px solid var(--color-sovereign-border)", color: "var(--color-gold)" }}
      >
        {retrying ? "Retrying…" : "Retry"}
      </button>
    </div>
  );
}
