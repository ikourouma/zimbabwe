"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { PersonalActivityReport } from "@/components/reports/personal-activity-report";
import { GovernmentExecutiveReport } from "@/components/reports/government-executive-report";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ReportScope = "personal" | "national";

/**
 * Dual-scope Reports workspace. Every signed-in persona gets "My Activity Summary" (their own
 * engagement history). Government, ZIDA Admin, and Platform Admin additionally get a "National
 * Executive Briefing" tab — the same platform-wide Government Executive Report generated from
 * /admin/reports and /super-admin/reports — so Government users can review the live briefing
 * themselves rather than only receiving it as a hand-off from staff.
 */
export default function DealRoomReportsPage() {
  const { isAuthenticated, isLoading, isGovernment, isAdmin } = useAuth();
  const [scope, setScope] = useState<ReportScope>("personal");
  const canViewNationalBriefing = isGovernment || isAdmin;

  if (!isLoading && !isAuthenticated) {
    return (
      <AccessGate
        title="Sign in required"
        description="Sign in to generate your personal Activity Report."
      />
    );
  }

  if (!canViewNationalBriefing) {
    return <PersonalActivityReport />;
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-white">Reports</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          View your personal activity log or the national pipeline executive briefing.
        </p>
      </div>

      <Tabs value={scope} onValueChange={(v) => setScope(v as ReportScope)} className="w-full">
        <TabsList className="bg-white/5 border-white/10 mb-5 flex-wrap h-auto">
          <TabsTrigger value="personal" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60">
            My Activity Summary
          </TabsTrigger>
          <TabsTrigger value="national" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60">
            National Executive Briefing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <PersonalActivityReport />
        </TabsContent>
        <TabsContent value="national">
          <GovernmentExecutiveReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
