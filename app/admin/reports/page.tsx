"use client";

import { useState } from "react";
import { ClipboardList, Landmark } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { PersonalActivityReport } from "@/components/reports/personal-activity-report";
import { GovernmentExecutiveReport } from "@/components/reports/government-executive-report";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ElevatedTabsList, ElevatedTabsTrigger } from "@/components/ui/elevated-tabs";

type ReportScope = "executive" | "personal";

/**
 * Reports workspace for ZIDA Admin — "Executive Report" (the platform-wide Government Executive
 * Report, this page's original sole purpose) plus "Activity Report" (the admin's own personal
 * activity log, same component the Deal Room Reports page already gives every persona), on
 * ElevatedTabsList tabs matching /deal-room/reports' pattern (Platform Feedback Batch v4, Phase 2).
 */
export default function AdminReportsPage() {
  const { isAdmin, isLoading } = useAuth();
  const [scope, setScope] = useState<ReportScope>("executive");

  if (!isLoading && !isAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Sign in with an admin account to generate the Government Executive Report."
      />
    );
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-white">Reports</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Generate the national pipeline executive briefing or your own personal activity log.
        </p>
      </div>

      <Tabs value={scope} onValueChange={(v) => setScope(v as ReportScope)} className="w-full">
        <ElevatedTabsList className="mb-5">
          <ElevatedTabsTrigger value="executive" icon={Landmark}>Executive Report</ElevatedTabsTrigger>
          <ElevatedTabsTrigger value="personal" icon={ClipboardList}>Activity Report</ElevatedTabsTrigger>
        </ElevatedTabsList>

        <TabsContent value="executive">
          <GovernmentExecutiveReport />
        </TabsContent>
        <TabsContent value="personal">
          <PersonalActivityReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
