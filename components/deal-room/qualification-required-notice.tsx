"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Lock } from "lucide-react";

interface QualificationRequiredNoticeProps {
  feature: string;
  description?: string;
  icon?: LucideIcon;
}

/**
 * Inline (not full-page) tier-gate for the Investor Dashboard sections still reserved for
 * qualified investors — Engagements, Communication Hub, My Proposals — now that `registered`
 * users can reach the console itself (Investor Dashboard Expansion plan). Softer than
 * `DealRoomAccessGate` (which is for the truly-unauthenticated edge case): the investor already
 * has a home here, this just explains what unlocks next.
 */
export function QualificationRequiredNotice({ feature, description, icon: Icon = Lock }: QualificationRequiredNoticeProps) {
  return (
    <div className="mx-auto max-w-lg text-center py-16">
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: "rgba(255,211,0,0.12)" }}
      >
        <Icon className="h-5 w-5" style={{ color: "var(--color-gold)" }} />
      </div>
      <h1 className="text-xl font-semibold text-white mb-2">Unlock {feature}</h1>
      <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
        {description ??
          `${feature} opens up once your investor profile is reviewed and your account is qualified. Complete your company profile to get started.`}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {/* My Profile is the resume/complete/submit surface (Deal Room Feedback Batch v2, Phase 2)
         *  — it saves KYC once and carries straight into the existing qualification pipeline,
         *  rather than sending a signed-in user straight back to the marketing wizard. */}
        <Link href="/deal-room/profile" className="btn-sovereign text-xs px-4 py-2 whitespace-nowrap">
          Complete My Profile
        </Link>
        <Link href="/deal-room" className="btn-sovereign-ghost text-xs px-4 py-2 whitespace-nowrap">
          Back to Overview
        </Link>
      </div>
    </div>
  );
}
