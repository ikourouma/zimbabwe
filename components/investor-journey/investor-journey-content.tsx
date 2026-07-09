"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DeepDiveShell } from "@/components/layout/deep-dive-shell";
import { FadeUp } from "@/components/ui/cinematic-reveal";
import { InvestorEngagementProcess } from "@/components/sections/investor-engagement-process";
import { InvestorAccessTiers } from "@/components/sections/investor-access-tiers";

export function InvestorJourneyContent() {
  return (
    <>
      <DeepDiveShell
        overline="For Investors · Investor Journey"
        title="From Discovery to Strategic Partnership"
        minHeightScreen={false}
      >
        <FadeUp>
          <p className="text-base max-w-2xl" style={{ color: "var(--color-text-secondary)" }}>
            A governed, four-step pathway connects browsing the ZIDA project registry to a qualified
            investment conversation — with entitlements that expand as you register and qualify for
            deeper access.
          </p>
        </FadeUp>
      </DeepDiveShell>

      <InvestorEngagementProcess />
      <InvestorAccessTiers />

      <div className="py-16 text-center" style={{ backgroundColor: "#050805" }}>
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-sm transition-colors hover:text-white"
          style={{ color: "var(--color-text-muted)" }}
        >
          Continue the narrative: Project Registry <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </>
  );
}
