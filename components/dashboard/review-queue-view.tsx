"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Briefcase,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  FileEdit,
  Loader2,
  X,
} from "lucide-react";
import { useProjectStore } from "@/context/project-store-context";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { useAuth } from "@/context/auth-context";
import { roleToWorkflowRole } from "@/lib/auth/role-map";
import { resolveProjectWorkflowRole, type WorkflowRoleActor } from "@/lib/auth/project-workflow-role";
import { projectMatchesMinistry } from "@/lib/entitlements/ministry-scope";
import type { InvestmentProject, ProjectMessageWithProject, ProjectStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/governance/project-workflow";
import { labelForAmendableField } from "@/lib/governance/amendable-fields";
import { StatusBadge } from "@/components/projects/status-badge";
import { ReviewActions } from "@/components/dashboard/review-actions";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { useProjectHistory } from "@/lib/hooks/use-project-history";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ElevatedTabsList, ElevatedTabsTrigger } from "@/components/ui/elevated-tabs";
import { Button } from "@/components/ui/button";

// Same set the page used before the redesign (submitted_for_review -> under_review ->
// changes_requested -> approved, i.e. everything short of published/archived).
const REVIEW_QUEUE_STATUSES: ProjectStatus[] = ["submitted_for_review", "under_review", "changes_requested", "approved"];

type QueueTab = "submissions" | "requests";

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </p>
      <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
        {value}
      </p>
    </div>
  );
}

/**
 * Unified Review Queue — "New Submissions" tab (Platform Feedback Batch v4, Phase 7). Every
 * project's full detail (financials, location, impact) is shown inline, expandable, *before* the
 * Approve/Request Changes/Reject buttons at the bottom — never just title + summary like the old
 * page. A "History" disclosure surfaces the same audit-log timeline the drawer's Timeline tab uses
 * (GET /api/projects/[id]/history via useProjectHistory), so reviewers don't have to leave the
 * queue to see what's already happened to a submission.
 */
function SubmissionCard({
  project,
  ministryName,
  workflowRole,
  readOnlyNotice,
  onAction,
}: {
  project: InvestmentProject;
  ministryName?: string;
  workflowRole: ReturnType<typeof roleToWorkflowRole>;
  readOnlyNotice?: string;
  onAction: (project: InvestmentProject, status: ProjectStatus, notes?: string) => void | Promise<void>;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { entries: history, isLoading: historyLoading } = useProjectHistory(showHistory ? project.id : null);

  return (
    <div className="dashboard-panel p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h3 className="text-sm font-semibold text-white">{project.title}</h3>
          {ministryName && (
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {ministryName}
            </p>
          )}
        </div>
        <StatusBadge status={project.projectStatus} />
      </div>
      <p className="text-sm mb-3" style={{ color: "var(--color-text-secondary)" }}>
        {project.opportunitySummary}
      </p>
      {project.reviewerNotes && (
        <div
          className="rounded-md p-3 text-sm mb-3"
          style={{ backgroundColor: "rgba(255, 211, 0, 0.1)", color: "#fde047" }}
        >
          {project.reviewerNotes}
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-3">
        <button
          type="button"
          onClick={() => setShowDetail((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-medium underline"
          style={{ color: "var(--color-gold)" }}
        >
          {showDetail ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          Full Project Detail
        </button>
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-medium underline"
          style={{ color: "var(--color-gold)" }}
        >
          {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          Action History
        </button>
      </div>

      {showDetail && (
        <div
          className="grid grid-cols-2 sm:grid-cols-3 gap-4 rounded-lg p-4 mb-3"
          style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid var(--color-sovereign-border)" }}
        >
          <Field label="Project Owner / Sponsor" value={project.projectOwner} />
          <Field label="Location" value={project.location} />
          <Field label="Province" value={project.province} />
          <Field label="District" value={project.district} />
          <Field label="Capital Required" value={project.capitalRequired} />
          <Field label="Financing Type" value={project.financingType} />
          <Field label="Readiness" value={project.projectReadiness} />
          <Field label="IRR" value={project.irr} />
          <Field label="NPV" value={project.npv} />
          <Field label="ROI" value={project.roi} />
          <Field label="Payback Period" value={project.paybackPeriod} />
          <Field label="Projected Revenue" value={project.projectedRevenue} />
          <Field label="Direct Jobs" value={project.jobsDirect} />
          <Field label="Indirect Jobs" value={project.jobsIndirect} />
          {project.developmentImpact && project.developmentImpact.length > 0 && (
            <div className="col-span-2 sm:col-span-3">
              <Field label="Development Impact" value={project.developmentImpact.join(", ")} />
            </div>
          )}
        </div>
      )}

      {showHistory && (
        <div className="rounded-lg p-4 mb-3" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid var(--color-sovereign-border)" }}>
          <ActivityFeed entries={history} isLoading={historyLoading} emptyMessage="No recorded history yet." />
        </div>
      )}

      {readOnlyNotice && (
        <p className="text-xs mb-3 rounded-md px-3 py-2" style={{ backgroundColor: "rgba(255,255,255,0.04)", color: "var(--color-text-muted)" }}>
          {readOnlyNotice}
        </p>
      )}

      <ReviewActions project={project} role={workflowRole} onAction={(status, notes) => onAction(project, status, notes)} />
    </div>
  );
}

/**
 * Unified Review Queue — "Pending Requests" tab. Every still-open `project_amendment_request`
 * Action Card, platform-wide (Phase 7's other headline fix: today these only lived buried inside
 * each project's own Communication Hub thread). Shows an explicit old (live project field) vs new
 * (`proposedChanges`) diff per field — the underlying payload already carries both sides, this is
 * purely a display concern. Approve/Decline reuse the existing adjudicator
 * (POST /api/messages/[id]/action), which already applies the change to the live project on
 * Approve. A `government`-filed request is two-stage (Phase 8): "Awaiting Ministry Admin" (open)
 * -> "Escalated" (their own ministry_admin already approved, ZIDA decides now) -> terminal. A
 * plain `admin` can't jump ahead of the ministry stage — only `super_admin` may override — same
 * gate POST /api/messages/[id]/action enforces server-side.
 */
function AmendmentCard({
  card,
  project,
  role,
  onDecide,
}: {
  card: ProjectMessageWithProject;
  project?: InvestmentProject;
  role: string | null;
  onDecide: (cardId: string, decision: "approve" | "decline") => Promise<void>;
}) {
  const [busy, setBusy] = useState<"approve" | "decline" | null>(null);
  const proposedChanges = card.payload?.proposedChanges ?? {};
  const fields = Object.keys(proposedChanges);
  const isGovFiled = card.authorRole === "government";
  const status = card.payload?.status ?? "open";
  const awaitingMinistryAdmin = isGovFiled && status === "open";
  const isEscalated = status === "escalated";
  // Stage-1 ("open", government-filed) is ministry_admin + super_admin (override). Stage-2
  // (escalated, or a single-stage investor-filed card) is admin/super_admin — ministry_admin
  // has already left the chain by then.
  const canActNow = awaitingMinistryAdmin
    ? role === "super_admin" || role === "ministry_admin"
    : role !== "ministry_admin";

  const badge = awaitingMinistryAdmin
    ? { bg: "rgba(59,130,246,0.15)", fg: "#93c5fd", label: "Awaiting Ministry Admin" }
    : isEscalated
      ? { bg: "rgba(168,85,247,0.15)", fg: "#d8b4fe", label: "Escalated — Final Decision" }
      : { bg: "rgba(255,211,0,0.15)", fg: "#fde047", label: "Pending" };

  const handle = async (decision: "approve" | "decline") => {
    setBusy(decision);
    try {
      await onDecide(card.id, decision);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="dashboard-panel p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h3 className="text-sm font-semibold text-white">{card.projectTitle}</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Requested by {card.authorName}
            {isGovFiled && card.payload?.requestingMinistryName ? ` (${card.payload.requestingMinistryName})` : ""} ·{" "}
            {new Date(card.createdAt).toLocaleString()}
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold shrink-0"
          style={{ backgroundColor: badge.bg, color: badge.fg }}
        >
          <Clock className="h-3 w-3" /> {badge.label}
        </span>
      </div>

      {card.payload?.reason && (
        <p className="text-sm mb-3" style={{ color: "var(--color-text-secondary)" }}>
          &ldquo;{card.payload.reason}&rdquo;
        </p>
      )}

      {card.payload?.firstStageApprovedByName && (
        <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
          Ministry-approved by {card.payload.firstStageApprovedByName}
          {card.payload.firstStageApprovedAt ? ` · ${new Date(card.payload.firstStageApprovedAt).toLocaleString()}` : ""}
        </p>
      )}

      {fields.length > 0 && (
        <div className="rounded-lg overflow-hidden mb-3" style={{ border: "1px solid var(--color-sovereign-border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
                <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                  Field
                </th>
                <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                  Current
                </th>
                <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                  Proposed
                </th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => {
                const current = project ? (project as unknown as Record<string, unknown>)[field] : undefined;
                const proposed = (proposedChanges as Record<string, unknown>)[field];
                return (
                  <tr key={field} className="border-t" style={{ borderColor: "var(--color-sovereign-border)" }}>
                    <td className="px-3 py-2 text-white font-medium whitespace-nowrap">{labelForAmendableField(field)}</td>
                    <td className="px-3 py-2" style={{ color: "var(--color-text-muted)" }}>
                      {current !== undefined && current !== null && current !== "" ? String(current) : "—"}
                    </td>
                    <td className="px-3 py-2" style={{ color: "#86efac" }}>
                      {String(proposed)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {canActNow ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy !== null} onClick={() => handle("approve")}>
            {busy === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}{" "}
            {role === "super_admin" && awaitingMinistryAdmin
              ? "Approve (Override)"
              : role === "ministry_admin"
                ? "Approve & Escalate"
                : "Approve"}
          </Button>
          <Button size="sm" variant="destructive" disabled={busy !== null} onClick={() => handle("decline")}>
            {busy === "decline" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} Decline
          </Button>
        </div>
      ) : (
        <p className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>
          Awaiting a decision from {card.payload?.requestingMinistryName ?? "the requester's"} Ministry Admin. A Super
          Admin can override if necessary.
        </p>
      )}
    </div>
  );
}

function AssociationCard({
  card,
  role,
  onDecide,
}: {
  card: ProjectMessageWithProject;
  role: string | null;
  onDecide: (cardId: string, decision: "approve" | "decline") => Promise<void>;
}) {
  const [busy, setBusy] = useState<"approve" | "decline" | null>(null);
  const canAct = role === "admin" || role === "super_admin";

  const handle = async (decision: "approve" | "decline") => {
    setBusy(decision);
    try {
      await onDecide(card.id, decision);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="dashboard-panel p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h3 className="text-sm font-semibold text-white">{card.projectTitle}</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Association requested by {card.authorName}
            {card.payload?.requestingMinistryName ? ` (${card.payload.requestingMinistryName})` : ""} ·{" "}
            {new Date(card.createdAt).toLocaleString()}
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold shrink-0"
          style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#93c5fd" }}
        >
          <Clock className="h-3 w-3" /> Association
        </span>
      </div>
      {card.payload?.reason && (
        <p className="text-sm mb-3" style={{ color: "var(--color-text-secondary)" }}>
          &ldquo;{card.payload.reason}&rdquo;
        </p>
      )}
      {canAct ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy !== null} onClick={() => handle("approve")}>
            {busy === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}{" "}
            Approve association
          </Button>
          <Button size="sm" variant="destructive" disabled={busy !== null} onClick={() => handle("decline")}>
            {busy === "decline" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} Decline
          </Button>
        </div>
      ) : (
        <p className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>
          Awaiting a ZIDA Admin decision.
        </p>
      )}
    </div>
  );
}

export function ReviewQueueView() {
  const { projects, updateProject, isLoading } = useProjectStore();
  const { ministries } = useTaxonomyStore();
  const { isAdmin, isMinistryAdmin, role, ministryId, userId, isLoading: authLoading } = useAuth();
  const [tab, setTab] = useState<QueueTab>("submissions");
  const [cards, setCards] = useState<ProjectMessageWithProject[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);

  const canLoadQueue = isAdmin || isMinistryAdmin;
  const actor: WorkflowRoleActor | null = role && userId ? { role, userId, ministryId } : null;
  const adminWorkflowRole = role && role !== "ministry_admin" ? roleToWorkflowRole(role) : null;
  const reviewQueue = useMemo(() => {
    const inStatus = projects.filter((p) => REVIEW_QUEUE_STATUSES.includes(p.projectStatus));
    if (role === "ministry_admin" && ministryId) {
      return inStatus.filter((p) => projectMatchesMinistry(p, ministryId));
    }
    return inStatus;
  }, [projects, role, ministryId]);
  const ministryName = (id?: string) => (id ? ministries.find((m) => m.id === id)?.name : undefined);

  const refreshCards = () => {
    setCardsLoading(true);
    fetch("/api/review-queue/amendments")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ProjectMessageWithProject[]) => setCards(data))
      .catch(() => setCards([]))
      .finally(() => setCardsLoading(false));
  };

  useEffect(() => {
    if (canLoadQueue) refreshCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLoadQueue]);

  const handleAction = async (project: InvestmentProject, status: ProjectStatus, notes?: string) => {
    try {
      await updateProject(project.id, { projectStatus: status, reviewerNotes: notes });
      toast.success(`"${project.title.slice(0, 40)}" moved to ${STATUS_LABELS[status].toLowerCase()}`);
    } catch {
      toast.error("Failed to update project status");
    }
  };

  const decide = async (cardId: string, decision: "approve" | "decline") => {
    try {
      const res = await fetch(`/api/messages/${cardId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Could not resolve this request.");
        return;
      }
      const updated = (await res.json().catch(() => null)) as ProjectMessageWithProject | null;
      const isAssociation = updated?.payload?.type === "ministry_association_request";
      if (decision === "approve" && updated?.payload?.status === "escalated") {
        toast.success("Ministry-approved — escalated to ZIDA Admin for final action.");
      } else if (isAssociation) {
        toast.success(decision === "approve" ? "Association approved — ministry added as a secondary beneficiary." : "Association request declined.");
      } else {
        toast.success(decision === "approve" ? "Amendment approved and applied to the live project." : "Amendment declined.");
      }
      refreshCards();
    } catch {
      toast.error("A network error occurred — please try again.");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Review Queue</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          {isMinistryAdmin
            ? "Your ministry's submissions plus government-filed amendment requests awaiting your first-stage decision. Approve escalates to ZIDA Admin; Decline closes the request."
            : "One surface for new submissions, amendment requests, and ministry association requests. Available actions are driven by your role's governance rules — buttons only show transitions you're actually authorized to make."}
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as QueueTab)}>
        <ElevatedTabsList className="mb-5">
          <ElevatedTabsTrigger value="submissions" icon={ClipboardCheck}>
            New Submissions{reviewQueue.length > 0 ? ` (${reviewQueue.length})` : ""}
          </ElevatedTabsTrigger>
          <ElevatedTabsTrigger value="requests" icon={FileEdit}>
            Pending Requests{cards.length > 0 ? ` (${cards.length})` : ""}
          </ElevatedTabsTrigger>
        </ElevatedTabsList>

        <TabsContent value="submissions">
          {isLoading || authLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="dashboard-panel p-5">
                  <div className="dashboard-skeleton h-4 w-1/3 mb-3" />
                  <div className="dashboard-skeleton h-3 w-full" />
                </div>
              ))}
            </div>
          ) : reviewQueue.length === 0 ? (
            <div className="dashboard-panel p-10 text-center" style={{ color: "var(--color-text-muted)" }}>
              <Briefcase className="h-6 w-6 mx-auto mb-2 opacity-50" />
              No projects in the review queue.
            </div>
          ) : (
            <div className="space-y-4">
              {reviewQueue.map((project) => {
                const projectWorkflowRole =
                  actor && role === "ministry_admin"
                    ? resolveProjectWorkflowRole(actor, project)
                    : adminWorkflowRole;
                const readOnlyNotice =
                  role === "ministry_admin" &&
                  ministryId &&
                  projectMatchesMinistry(project, ministryId) &&
                  project.primaryBeneficiaryMinistryId !== ministryId
                    ? "Read-only — your ministry is a secondary beneficiary on this project. Only the primary beneficiary ministry may advance review actions."
                    : undefined;

                return (
                <SubmissionCard
                  key={project.id}
                  project={project}
                  ministryName={ministryName(project.primaryBeneficiaryMinistryId)}
                  workflowRole={projectWorkflowRole}
                  readOnlyNotice={readOnlyNotice}
                  onAction={handleAction}
                />
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests">
          {cardsLoading || authLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="dashboard-panel p-5">
                  <div className="dashboard-skeleton h-4 w-1/3 mb-3" />
                  <div className="dashboard-skeleton h-3 w-full" />
                </div>
              ))}
            </div>
          ) : cards.length === 0 ? (
            <div className="dashboard-panel p-10 text-center" style={{ color: "var(--color-text-muted)" }}>
              <FileEdit className="h-6 w-6 mx-auto mb-2 opacity-50" />
              No pending amendment or association requests.
            </div>
          ) : (
            <div className="space-y-4">
              {cards.map((card) =>
                card.payload?.type === "ministry_association_request" ? (
                  <AssociationCard key={card.id} card={card} role={role} onDecide={decide} />
                ) : (
                  <AmendmentCard
                    key={card.id}
                    card={card}
                    project={projects.find((p) => p.id === card.projectId)}
                    role={role}
                    onDecide={decide}
                  />
                )
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
