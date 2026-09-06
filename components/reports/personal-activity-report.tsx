"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useDealRoomStore } from "@/context/deal-room-store-context";
import { useProjectStore } from "@/context/project-store-context";
import type { InvestmentProject, InvestorEngagement, InvestorEngagementStatus } from "@/lib/types";
import { parseCapitalTotalMillions, formatMillions } from "@/lib/utils/capital";
import { ReportShell, ReportSection, ReportStat, ReportEmptyState, type ReportStatTone } from "@/components/reports/report-shell";
import { ROLE_LABELS } from "@/components/dashboard/role-change-modal";

const ENGAGEMENT_STATUS_LABELS: Record<InvestorEngagementStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
};

// Presentational status chips only — colors carry no meaning beyond "same palette as the rest of
// the report", not a new data claim.
const ENGAGEMENT_STATUS_CHIP: Record<InvestorEngagementStatus, string> = {
  draft: "bg-zim-border/40 text-zim-charcoal border border-zim-border",
  submitted: "bg-sky-50 text-sky-700 border border-sky-200",
  under_review: "bg-amber-50 text-amber-700 border border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  rejected: "bg-red-50 text-red-700 border border-red-200",
};

// A deterministic next-step prompt derived from the record's real workflow status — never a
// fabricated milestone date or assignee, since engagement records don't carry that data yet.
const NEXT_STEP_COPY: Record<InvestorEngagementStatus, string> = {
  draft: "Complete & submit for review",
  submitted: "Awaiting ZIDA desk review",
  under_review: "Awaiting a decision",
  approved: "Proceed to MOU drafting",
  rejected: "Review feedback with your case manager",
};

/** Resolves the millions-of-USD figure backing an engagement's indicative ticket, if any is
 *  derivable — the engagement's own free-text ticketSize first, falling back to the linked
 *  project's headline capitalRequired (a real, already-published figure) when the investor hasn't
 *  logged their own number yet. Returns null (never a fabricated guess) when neither parses. */
function resolveTicketMillions(engagement: InvestorEngagement, project: InvestmentProject | undefined): number | null {
  const own = engagement.ticketSize ? parseCapitalTotalMillions(engagement.ticketSize) : null;
  if (own !== null) return own;
  return project?.capitalRequired ? parseCapitalTotalMillions(project.capitalRequired) : null;
}

/** Table-cell text for the "Indicative Ticket" column — the investor's own figure verbatim when
 *  they've logged one, else a clearly-labeled project-ask estimate, else an honest "not yet
 *  specified" rather than a bare, unexplained dash. */
function resolveTicketCell(engagement: InvestorEngagement, project: InvestmentProject | undefined): string {
  if (engagement.ticketSize) return engagement.ticketSize;
  const projectMillions = project?.capitalRequired ? parseCapitalTotalMillions(project.capitalRequired) : null;
  if (projectMillions !== null) return `${formatMillions(projectMillions)} (project ask)`;
  return "Not yet specified";
}

/**
 * Lightweight personal Activity Report for every non-staff-report persona (qualified investor,
 * government liaison, registered user — and admin/super_admin, whose own personal activity is
 * usually empty since they generate the platform-wide Government Executive Report instead). Their
 * own engagement history and account standing, for their own records — distinct from that
 * platform-wide report. Same window.print()-based pattern, no PDF dependency.
 *
 * "My" scope is deliberately role-aware rather than "everything the viewer's role can see": a
 * government official (or ministry_admin — Platform Feedback Batch v3, Phase 1's /ministry/reports
 * reuses this same component for console-admin-at-ministry-level parity) doesn't author engagements
 * themselves, so ownership isn't the right lens — their "My Engagements" is scoped to engagements
 * against their own ministry's projects instead. Everyone else (qualified/registered/staff) is
 * scoped to engagements they personally initiated. Previously this rendered every engagement on the
 * platform under a "My Engagements" heading regardless of who was signed in — a real
 * correctness/privacy gap, not just a cosmetic one.
 */
export function PersonalActivityReport() {
  const {
    name,
    email,
    role,
    organization,
    ndaAcceptedAt,
    userId,
    ministryId,
    isAdmin,
    isGovernment,
    isMinistryAdmin,
    isSuperAdmin,
  } = useAuth();
  const { engagements, isLoading: engagementsLoading } = useDealRoomStore();
  const { projects, isLoading: projectsLoading } = useProjectStore();

  const isLoading = engagementsLoading || projectsLoading;
  const isMinistryScoped = isGovernment || isMinistryAdmin;
  // Mirrors NdaGate's own exemption rule (components/deal-room/nda-gate.tsx) — only true
  // ZIDA-internal staff (admin/super_admin) are exempt from the NDA. Phase 3 broadened the gate to
  // every non-staff role, so `government`/`ministry_admin` are deliberately NOT exempt here anymore
  // (they were, incorrectly, before this batch) — they now go through the same clickwrap as any
  // other non-staff console user before their first dashboard visit.
  const isNdaExempt = isAdmin || isSuperAdmin;

  // ZIDA's own reviewing officers are `government` too, but carry no ministryId — their remit is
  // national. Telling one of them their report covers "your ministry's portfolio" names an
  // affiliation they do not have, and the list below it (which returns empty without a ministryId)
  // then appears to contradict itself.
  const scopeNote = isMinistryScoped
    ? ministryId
      ? "Engagements against projects under your ministry's portfolio."
      : "Engagements against projects across the national pipeline."
    : "Engagements you have personally initiated.";

  const myEngagements = useMemo(() => {
    if (isMinistryScoped) {
      // A national reviewer has no ministryId, and returning nothing gave them an activity report
      // that was permanently empty. Their remit is the whole pipeline, so that is what they get.
      if (!ministryId) return engagements;
      const ministryProjectIds = new Set(
        projects.filter((p) => p.primaryBeneficiaryMinistryId === ministryId).map((p) => p.id)
      );
      return engagements.filter((e) => ministryProjectIds.has(e.projectId));
    }
    return engagements.filter((e) => e.userId === userId);
  }, [engagements, projects, isMinistryScoped, ministryId, userId]);

  const engagementRows = useMemo(
    () =>
      myEngagements.map((e) => {
        const project = projects.find((p) => p.id === e.projectId);
        return { engagement: e, project, ticketCell: resolveTicketCell(e, project) };
      }),
    [myEngagements, projects]
  );

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<InvestorEngagementStatus, number>> = {};
    for (const e of myEngagements) counts[e.status] = (counts[e.status] ?? 0) + 1;
    return counts;
  }, [myEngagements]);

  const capitalTracked = useMemo(() => {
    let sumMillions = 0;
    let derivedCount = 0;
    for (const e of myEngagements) {
      const project = projects.find((p) => p.id === e.projectId);
      const millions = resolveTicketMillions(e, project);
      if (millions !== null) {
        sumMillions += millions;
        derivedCount += 1;
      }
    }
    return { sumMillions, derivedCount };
  }, [myEngagements, projects]);

  const ndaValue = isNdaExempt ? "Not applicable (staff role)" : ndaAcceptedAt ? "Accepted" : "Pending signature";
  const ndaTone: ReportStatTone = isNdaExempt ? "neutral" : ndaAcceptedAt ? "good" : "warning";
  const pendingCount = (statusCounts.submitted ?? 0) + (statusCounts.under_review ?? 0);

  return (
    <ReportShell
      title="My Activity Report"
      subtitle="Personal summary of your engagements and account activity on the platform"
      generatedBy={`${name ?? "—"} (${role ? ROLE_LABELS[role] : "—"})`}
      generatedAt={new Date().toLocaleString()}
    >
      {isLoading ? (
        <p className="text-sm text-zim-muted">Loading report data…</p>
      ) : (
        <>
          <ReportSection title="Account Summary">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ReportStat label="Name" value={name ?? "—"} />
              <ReportStat label="Email" value={email ?? "—"} />
              <ReportStat label="Organization" value={organization ?? "—"} />
              <ReportStat label="Role" value={role ? ROLE_LABELS[role] : "—"} />
              <ReportStat label="Confidentiality Framework" value={ndaValue} tone={ndaTone} />
            </div>
          </ReportSection>

          <ReportSection title="Engagement Summary">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ReportStat label="Total Engagements" value={myEngagements.length} />
              {capitalTracked.derivedCount > 0 && (
                <ReportStat
                  label="Tracked Indicative Capital"
                  value={formatMillions(capitalTracked.sumMillions)}
                  hint={`Across ${capitalTracked.derivedCount} of ${myEngagements.length} engagement(s) with a stated figure`}
                />
              )}
              <ReportStat label="Pending Review" value={pendingCount} tone={pendingCount > 0 ? "warning" : "neutral"} />
              <ReportStat label="Approved" value={statusCounts.approved ?? 0} tone={(statusCounts.approved ?? 0) > 0 ? "good" : "neutral"} />
            </div>
          </ReportSection>

          <ReportSection title="My Engagements">
            <p className="mb-2 text-[11px] text-zim-muted">{scopeNote}</p>
            {engagementRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-zim-border text-left">
                      <th className="py-1.5 pr-4 text-[11px] uppercase tracking-wide text-zim-muted">Project</th>
                      <th className="py-1.5 pr-4 text-[11px] uppercase tracking-wide text-zim-muted">Status</th>
                      <th className="py-1.5 pr-4 text-[11px] uppercase tracking-wide text-zim-muted">Indicative Ticket</th>
                      <th className="py-1.5 pr-4 text-[11px] uppercase tracking-wide text-zim-muted">Started</th>
                      <th className="py-1.5 pr-4 text-[11px] uppercase tracking-wide text-zim-muted">Next Step</th>
                    </tr>
                  </thead>
                  <tbody>
                    {engagementRows.map(({ engagement, project, ticketCell }) => (
                      <tr key={engagement.id} className="border-b border-zim-border/60">
                        <td className="py-1.5 pr-4 font-medium text-zim-charcoal">{project?.title ?? engagement.projectId}</td>
                        <td className="py-1.5 pr-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${ENGAGEMENT_STATUS_CHIP[engagement.status]}`}
                          >
                            {ENGAGEMENT_STATUS_LABELS[engagement.status]}
                          </span>
                        </td>
                        <td className="py-1.5 pr-4 text-zim-charcoal">{ticketCell}</td>
                        <td className="py-1.5 pr-4 text-zim-charcoal">{new Date(engagement.createdAt).toLocaleDateString()}</td>
                        <td className="py-1.5 pr-4 text-zim-muted">{NEXT_STEP_COPY[engagement.status]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <ReportEmptyState
                message={
                  isMinistryScoped && !ministryId
                    ? "Your account isn't yet linked to a specific beneficiary ministry, so no engagements can be scoped to you personally — see the National Executive Briefing tab for the platform-wide view."
                    : "No engagements recorded yet."
                }
              />
            )}
            <p className="mt-2 text-[11px] text-zim-muted print:hidden">
              <Link href="/deal-room/engagements" className="text-zim-green-700 hover:underline">
                Open the full Pipeline &amp; Engagements workspace →
              </Link>
            </p>
          </ReportSection>
        </>
      )}
    </ReportShell>
  );
}
