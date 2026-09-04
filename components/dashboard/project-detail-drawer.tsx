"use client";

import type { InvestmentProject, Ministry, ProjectStatus } from "@/lib/types";
import type { WorkflowRole } from "@/lib/governance/project-workflow";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/projects/status-badge";
import { ReviewActions } from "@/components/dashboard/review-actions";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { EngagementStatusPill } from "@/components/deal-room/engagement-status-pill";
import { EngagementDetailDrawer } from "@/components/deal-room/engagement-detail-drawer";
import { NewEngagementWizard } from "@/components/deal-room/new-engagement-wizard";
import { MessageThread } from "@/components/deal-room/message-thread";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ElevatedTabsList, ElevatedTabsTrigger } from "@/components/ui/elevated-tabs";
import { Button } from "@/components/ui/button";
import { WatchlistButton } from "@/components/projects/watchlist-button";
import { toast } from "sonner";
import { useProjectHistory } from "@/lib/hooks/use-project-history";
import { useDealRoomStore } from "@/context/deal-room-store-context";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { useAuth } from "@/context/auth-context";
import { getSectorById, getSubsectorById, getPillarById, getSdgById } from "@/lib/data/taxonomies";
import { SdgBadge } from "@/components/ui/sdg-badge";
import { DATA_VERIFICATION_LABELS, accessLevelForRole, canAccessVisibilityLevel } from "@/lib/entitlements/visibility";
import {
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CircleDashed,
  ClipboardList,
  Eye,
  FileText,
  Handshake,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  MessageSquarePlus,
  Pencil,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useProjectStore } from "@/context/project-store-context";
import { resolveProjectCaseManager, projectMatchesMinistry } from "@/lib/entitlements/ministry-scope";
import { RequestAssociationButton } from "@/components/deal-room/request-association-modal";
import { RequestAmendmentForm } from "@/components/deal-room/request-amendment-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DrawerTab = "overview" | "timeline" | "messages" | "actions";

interface ProjectDetailDrawerProps {
  project: InvestmentProject | null;
  onClose: () => void;
  /** null = read-only viewer (no review actions rendered) — e.g. a qualified investor. Also
   *  drives the "Engaged Investors" section's framing copy below. */
  workflowRole?: WorkflowRole | null;
  onAction?: (projectId: string, status: ProjectStatus, notes?: string) => void | Promise<void>;
  /** Staff-only "Edit project" affordance — opens the sectioned ProjectForm in edit mode. */
  onEdit?: (project: InvestmentProject) => void;
  /** Jump straight to a tab on open — e.g. the kanban card's message icon opens straight to
   *  "messages" instead of making the user click through from Overview. */
  initialTab?: DrawerTab;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
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

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide mb-1.5" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

function Chip({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "active" }) {
  return <span className={`status-badge status-badge-${tone}`}>{children}</span>;
}

type CaseManagerCandidate = { userId: string; name: string; role: string };

/**
 * Case Manager chip + selector (Team Ministry Traceability Batch, Phase 2, item 6) — shown to
 * `admin`/`super_admin` viewers on any project. Resolves the *effective* assignee (per-project
 * override, else the project's ministry's default desk officer) via resolveProjectCaseManager,
 * and lets staff change either the project-level override or the ministry-wide default from the
 * same control — see the plan's "entitlement parity" note on why this lives here rather than in
 * the super_admin-only Taxonomies tab.
 */
function CaseManagerSection({
  project,
  ministry,
  isStaffViewer,
}: {
  project: InvestmentProject;
  ministry: Ministry | undefined;
  isStaffViewer: boolean;
}) {
  const { updateProject } = useProjectStore();
  const { refresh: refreshTaxonomies } = useTaxonomyStore();
  const [candidates, setCandidates] = useState<CaseManagerCandidate[]>([]);
  const [saving, setSaving] = useState(false);
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [editing, setEditing] = useState(false);
  // Safe reassignment handoff (Phase 8, item 3) — changing a ministry's default silently
  // re-routes every project that has no per-project override, so we surface that blast radius
  // before committing rather than after.
  const [defaultChangeConfirm, setDefaultChangeConfirm] = useState<{ userId: string; inheritingCount: number } | null>(null);

  useEffect(() => {
    if (!isStaffViewer) return;
    let cancelled = false;
    fetch("/api/case-managers")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: CaseManagerCandidate[]) => {
        if (!cancelled) setCandidates(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isStaffViewer]);

  const effectiveId = resolveProjectCaseManager(project, ministry);
  const displayName = candidates.find((c) => c.userId === effectiveId)?.name;
  const isOverride = Boolean(project.assignedStaffUserId);

  // Advisory-only staff metadata — never shown to investors/government/ministry_admin viewers.
  if (!isStaffViewer) return null;

  async function applyChange(userId: string) {
    setSaving(true);
    try {
      await updateProject(project.id, { assignedStaffUserId: userId || null });
      if (setAsDefault && ministry) {
        await fetch(`/api/ministries/${ministry.id}/case-manager`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ staffUserId: userId || null }),
        });
        await refreshTaxonomies?.();
      }
      toast.success(userId ? "Case Manager updated" : "Case Manager cleared");
      setEditing(false);
      setSetAsDefault(false);
      setDefaultChangeConfirm(null);
    } catch {
      toast.error("Could not update Case Manager");
    } finally {
      setSaving(false);
    }
  }

  async function handleSelectChange(userId: string) {
    if (!setAsDefault || !ministry) return applyChange(userId);
    try {
      const res = await fetch(`/api/ministries/${ministry.id}/case-manager`);
      const { inheritingCount } = res.ok ? await res.json() : { inheritingCount: 0 };
      if (inheritingCount > 0) {
        setDefaultChangeConfirm({ userId, inheritingCount });
        return;
      }
    } catch {
      // fall through — proceed without the count rather than block the change entirely
    }
    applyChange(userId);
  }

  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide mb-1.5" style={{ color: "var(--color-text-muted)" }}>
        Case Manager
      </p>
      {editing ? (
        <div className="space-y-2">
          <select
            className="dashboard-input w-full"
            defaultValue={effectiveId ?? ""}
            disabled={saving}
            onChange={(e) => handleSelectChange(e.target.value)}
          >
            <option value="">Unassigned</option>
            {candidates.map((c) => (
              <option key={c.userId} value={c.userId}>
                {c.name} ({c.role === "super_admin" ? "Super Admin" : "ZIDA Admin"})
              </option>
            ))}
          </select>
          {ministry && (
            <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
              <input type="checkbox" checked={setAsDefault} onChange={(e) => setSetAsDefault(e.target.checked)} />
              Set as this ministry&apos;s default Case Manager
            </label>
          )}
          <Button size="sm" variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Chip tone={displayName ? "active" : "info"}>
            <ShieldCheck className="h-3 w-3 mr-1 inline" />
            {displayName ?? "Unassigned"}
            {displayName && isOverride && <span className="opacity-70"> · override</span>}
            {displayName && !isOverride && <span className="opacity-70"> · ministry default</span>}
          </Chip>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs underline"
            style={{ color: "var(--color-text-muted)" }}
          >
            Change
          </button>
        </div>
      )}

      <Dialog open={Boolean(defaultChangeConfirm)} onOpenChange={(open) => !open && setDefaultChangeConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update {ministry?.name ?? "this ministry"}&apos;s default Case Manager?</DialogTitle>
            <DialogDescription>
              {defaultChangeConfirm?.inheritingCount} project{defaultChangeConfirm?.inheritingCount === 1 ? "" : "s"} with no
              per-project override currently inherit this ministry&apos;s default and will immediately route to the new Case
              Manager. Projects that already have their own override are unaffected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDefaultChangeConfirm(null)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => defaultChangeConfirm && applyChange(defaultChangeConfirm.userId)} disabled={saving}>
              {saving ? "Updating…" : `Update default for all ${defaultChangeConfirm?.inheritingCount ?? 0}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type ReviewingOfficerCandidate = { userId: string; name: string; role: string };

/**
 * "Assigned Reviewing Officer" chip + selector (Platform Feedback Batch v4, Phase 6) — a lightweight
 * per-project assignment of one individual `government` reviewer, distinct from the Case Manager
 * above (admin/super_admin-only, "drives" the process). Settable by the project's own `ministry_admin`
 * or `admin`/`super_admin`; visible read-only to `government` viewers for transparency (it's what
 * powers their own "My Assigned Projects" pipeline filter). One officer can be assigned across many
 * projects — this is "one officer per project", never "one project per officer".
 */
function ReviewingOfficerSection({
  project,
  canEdit,
  canView,
}: {
  project: InvestmentProject;
  canEdit: boolean;
  canView: boolean;
}) {
  const { updateProject } = useProjectStore();
  const [candidates, setCandidates] = useState<ReviewingOfficerCandidate[]>([]);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!canEdit) return;
    let cancelled = false;
    fetch(`/api/reviewing-officers?ministryId=${project.primaryBeneficiaryMinistryId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ReviewingOfficerCandidate[]) => {
        if (!cancelled) setCandidates(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [canEdit, project.primaryBeneficiaryMinistryId]);

  if (!canView) return null;

  const officerId = project.assignedReviewingOfficerUserId ?? null;
  const displayName = candidates.find((c) => c.userId === officerId)?.name;

  async function applyChange(userId: string) {
    setSaving(true);
    try {
      await updateProject(project.id, { assignedReviewingOfficerUserId: userId || null });
      toast.success(userId ? "Assigned Reviewing Officer updated" : "Assigned Reviewing Officer cleared");
      setEditing(false);
    } catch {
      toast.error("Could not update the Assigned Reviewing Officer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide mb-1.5" style={{ color: "var(--color-text-muted)" }}>
        Assigned Reviewing Officer
      </p>
      {editing ? (
        <div className="space-y-2">
          <select
            className="dashboard-input w-full"
            defaultValue={officerId ?? ""}
            disabled={saving}
            onChange={(e) => applyChange(e.target.value)}
          >
            <option value="">Unassigned</option>
            {candidates.map((c) => (
              <option key={c.userId} value={c.userId}>
                {c.name}
              </option>
            ))}
          </select>
          {candidates.length === 0 && (
            <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              No active government reviewers are linked to this ministry yet.
            </p>
          )}
          <Button size="sm" variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Chip tone={displayName ? "active" : "info"}>
            <Users className="h-3 w-3 mr-1 inline" />
            {officerId ? (displayName ?? "Assigned") : "Unassigned"}
          </Chip>
          {canEdit && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs underline"
              style={{ color: "var(--color-text-muted)" }}
            >
              Change
            </button>
          )}
        </div>
      )}
    </div>
  );
}

type CheckState = "pass" | "warn" | "todo";

/** A single governance/compliance check line — green tick (met), amber alert (attention), or
 *  dashed circle (not yet addressed). Reviewers scan this before approving/publishing. */
function ChecklistItem({ state, label, detail }: { state: CheckState; label: string; detail?: string }) {
  const Icon = state === "pass" ? CheckCircle2 : state === "warn" ? CircleAlert : CircleDashed;
  const color = state === "pass" ? "#4ade80" : state === "warn" ? "#fbbf24" : "var(--color-text-muted)";
  return (
    <li className="flex items-start gap-2">
      <Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color }} />
      <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        <span className="text-white">{label}</span>
        {detail && <span className="ml-1" style={{ color: "var(--color-text-muted)" }}>· {detail}</span>}
      </span>
    </li>
  );
}

/** Governance summary + compliance checklist shown atop the Actions tab so a reviewer sees the
 *  disclosure/readiness posture (data-verification, documents, financials, NDA-teaser) before
 *  driving a status transition. All derived from existing project data — no new persistence. */
function GovernanceChecklist({ project, sectorName }: { project: InvestmentProject; sectorName?: string }) {
  const verified = project.dataVerificationStatus === "verified";
  const hasDocs = (project.documents?.length ?? 0) > 0;
  const hasFinancials = Boolean(project.capitalRequired);
  const disclosureReady = Boolean(project.opportunitySummary && project.description);

  return (
    <div
      className="rounded-lg p-3 mb-4 space-y-3"
      style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid var(--color-sovereign-border)" }}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
        {sectorName && <span className="text-white">{sectorName}</span>}
        {project.province && <span>· {project.province}</span>}
        {project.submittedAt && <span>· Submitted {new Date(project.submittedAt).toLocaleDateString()}</span>}
        {project.createdBy && <span>· by {project.createdBy}</span>}
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wide mb-2" style={{ color: "var(--color-text-muted)" }}>
          Compliance Checklist
        </p>
        <ul className="space-y-1.5">
          <ChecklistItem
            state={verified ? "pass" : project.dataVerificationStatus === "pending_review" ? "warn" : "todo"}
            label="Data verification"
            detail={DATA_VERIFICATION_LABELS[project.dataVerificationStatus]}
          />
          <ChecklistItem
            state={hasDocs ? "pass" : "warn"}
            label="Supporting documents"
            detail={hasDocs ? `${project.documents.length} attached` : "None uploaded to the data room"}
          />
          <ChecklistItem
            state={hasFinancials ? "pass" : "todo"}
            label="Capital / financials"
            detail={hasFinancials ? project.capitalRequired : "Capital requirement not stated (teaser only)"}
          />
          <ChecklistItem
            state={disclosureReady ? "pass" : "warn"}
            label="Public disclosure copy"
            detail={disclosureReady ? "Summary & description present" : "Missing summary or description"}
          />
        </ul>
      </div>
    </div>
  );
}

/** Shared master-detail drawer used by Admin Projects, Admin Review Queue, and Deal Room
 *  Pipeline — one drill-down surface instead of three divergent ones, per the Fortune-100
 *  dashboard redesign plan. */
export function ProjectDetailDrawer({
  project,
  onClose,
  workflowRole = null,
  onAction,
  onEdit,
  initialTab,
}: ProjectDetailDrawerProps) {
  const { entries: history, isLoading: historyLoading } = useProjectHistory(project?.id ?? null);
  const { getEngagementsForProject, addEngagement, refresh: refreshEngagements } = useDealRoomStore();
  const { ministries } = useTaxonomyStore();
  const {
    name,
    userId: viewerUserId,
    isQualified,
    isAdmin: isAdminReal,
    isSuperAdmin: isSuperAdminReal,
    isGovernment: isGovernmentReal,
    role: realRole,
    ministryId: viewerMinistryId,
    ndaAcceptedAt,
  } = useAuth();
  // Case Manager assignment (Phase 2, item 6) is symmetric admin/super_admin — same
  // entitlement-parity convention as the rest of this drawer's staff-only affordances.
  const isCaseManagerAdmin = isAdminReal || isSuperAdminReal;
  // Assigned Reviewing Officer (Phase 6) — editable by the project's own ministry_admin or
  // admin/super_admin; visible read-only to government for transparency (it's what powers their
  // own "My Assigned Projects" pipeline filter). Strict primary-ministry match (not the broader
  // projectMatchesMinistry, which also covers secondary beneficiaries) — mirrors exactly the same
  // primaryBeneficiaryMinistryId check resolveProjectWorkflowRole uses to grant ministry_admin
  // write authority on this project at all, so this edit control never renders somewhere the
  // PATCH itself would 403.
  const canEditReviewingOfficer =
    isCaseManagerAdmin ||
    (realRole === "ministry_admin" &&
      Boolean(viewerMinistryId) &&
      project?.primaryBeneficiaryMinistryId === viewerMinistryId);
  const canViewReviewingOfficer = canEditReviewingOfficer || isGovernmentReal;
  const [activeTab, setActiveTab] = useState<DrawerTab>(initialTab ?? "overview");
  const [wizardOpen, setWizardOpen] = useState(false);
  // An investor (viewer with no workflow role) gets self-service engagement CTAs; staff do not.
  const isInvestor = workflowRole === null && isQualified;
  // Track by id (not the object) so the nested drawer re-derives from the fresh store list after an
  // edit/publish/correction refresh — otherwise it would keep showing a stale captured copy.
  const [selectedEngagementId, setSelectedEngagementId] = useState<string | null>(null);

  // Re-sync the active tab whenever a *different* project is opened (or the caller requests a
  // specific tab, e.g. the kanban card's message icon) — without this, the drawer would keep
  // whatever tab was last active when switching between projects.
  useEffect(() => {
    if (project) setActiveTab(initialTab ?? "overview");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, initialTab]);

  const engagements = project ? getEngagementsForProject(project.id) : [];
  const selectedEngagement = engagements.find((e) => e.id === selectedEngagementId) ?? null;

  const publishEngagement = async (id: string, payload: Record<string, unknown>): Promise<boolean> => {
    const res = await fetch(`/api/engagements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not publish the engagement.");
      return false;
    }
    await refreshEngagements();
    return true;
  };
  const sector = project ? getSectorById(project.sectorId) : undefined;
  const subsector = project?.subsectorId ? getSubsectorById(project.subsectorId) : undefined;
  const pillars = (project?.strategicPillarIds ?? []).map((id) => getPillarById(id)).filter(Boolean);
  const sdgs = (project?.sdgIds ?? []).map((id) => getSdgById(id)).filter(Boolean);
  const primaryMinistry = project ? ministries.find((m) => m.id === project.primaryBeneficiaryMinistryId) : undefined;
  const secondaryMinistries = (project?.secondaryBeneficiaryMinistryIds ?? [])
    .map((id) => ministries.find((m) => m.id === id))
    .filter(Boolean);

  return (
    <>
    <Sheet open={Boolean(project)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl">
        {project && (
          <>
            <SheetHeader>
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <StatusBadge status={project.projectStatus} />
                  {project.investorSubmitted && (
                    <span className="status-badge status-badge-info">Investor-Submitted Proposal</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Clearly-visible Edit affordance (Platform Feedback Batch v3, Phase 5) — moved
                   *  out of the Actions tab (where it was easy to miss) into the header, visible
                   *  regardless of which tab is active. Navigates straight to the full-page wizard
                   *  in edit mode instead of closing the drawer to open a second popup. */}
                  {onEdit && (
                    <Button size="sm" variant="secondary" onClick={() => onEdit(project)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                  )}
                  <WatchlistButton projectId={project.id} dark compact />
                </div>
              </div>
              <SheetTitle>{project.title}</SheetTitle>
              <SheetDescription>{project.opportunitySummary}</SheetDescription>
            </SheetHeader>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DrawerTab)}>
              <ElevatedTabsList>
                <ElevatedTabsTrigger value="overview" icon={LayoutDashboard}>Overview</ElevatedTabsTrigger>
                <ElevatedTabsTrigger value="timeline" icon={ClipboardList}>Timeline</ElevatedTabsTrigger>
                <ElevatedTabsTrigger value="messages" icon={MessageSquare}>Messages</ElevatedTabsTrigger>
                {workflowRole && <ElevatedTabsTrigger value="actions" icon={ShieldCheck}>Actions</ElevatedTabsTrigger>}
              </ElevatedTabsList>

              <TabsContent value="overview" className="mt-4 space-y-4">
                {/* Investor action bar — the drawer is an investor's primary path into an
                 *  engagement (Log Engagement opens the certification wizard) or a question to the
                 *  ZIDA deal team (jumps to the Messages thread). Staff don't see this; they drive
                 *  the workflow from the Actions tab. */}
                {isInvestor && (
                  <div
                    className="rounded-lg p-3 space-y-3"
                    style={{ backgroundColor: "rgba(0,100,0,0.12)", border: "1px solid var(--color-sovereign-border)" }}
                  >
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => setWizardOpen(true)}>
                        <Handshake className="h-4 w-4 mr-1.5" /> Log Engagement
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setActiveTab("messages")}>
                        <MessageSquarePlus className="h-4 w-4 mr-1.5" /> Ask the Deal Team
                      </Button>
                    </div>
                    <div className="flex items-start gap-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      <LifeBuoy className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--color-gold)" }} />
                      <span>
                        <strong className="text-white">ZIDA Deal Team</strong> — your dedicated case managers guide each
                        engagement from first interest through MOU and signature. Questions posted here are private to
                        you and the deal team.
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Project Owner" value={project.projectOwner} />
                  <Field label="Location" value={project.location} />
                  <Field label="Capital Required" value={project.capitalRequired} />
                  <Field label="Financing Type" value={project.financingType} />
                  <Field label="Readiness" value={project.projectReadiness} />
                  <Field label="Visibility" value={project.visibilityLevel.replace(/_/g, " ")} />
                </div>
                {/* Alignment & Beneficiaries — sector/subsector, strategic pillars, SDGs, and
                 *  beneficiary ministries as chip rows, resolved via the taxonomy helpers (SDG
                 *  taxonomy is a fixed global standard, not super-admin-editable, so it's read
                 *  from lib/data/taxonomies directly; ministries are live-edited, so they come
                 *  from the taxonomy store — same split the kanban card already uses). */}
                <div className="space-y-3 rounded-lg p-3" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid var(--color-sovereign-border)" }}>
                  {(sector || subsector) && (
                    <ChipRow label="Sector">
                      {sector && <Chip tone="active">{sector.shortName ?? sector.name}</Chip>}
                      {subsector && <Chip>{subsector.name}</Chip>}
                    </ChipRow>
                  )}
                  {pillars.length > 0 && (
                    <ChipRow label="Strategic Pillars">
                      {pillars.map((p) => p && <Chip key={p.id}>{p.name.split("&")[0].trim()}</Chip>)}
                    </ChipRow>
                  )}
                  {sdgs.length > 0 && (
                    <ChipRow label="Sustainable Development Goals">
                      {sdgs.map((s) => s && <SdgBadge key={s.id} sdg={s} size="sm" />)}
                    </ChipRow>
                  )}
                  {(primaryMinistry || secondaryMinistries.length > 0) && (
                    <ChipRow label={secondaryMinistries.length > 0 ? "Beneficiary Ministries" : "Beneficiary Ministry"}>
                      {primaryMinistry && (
                        <Chip tone="active">
                          {primaryMinistry.shortName} <span className="opacity-70">· primary</span>
                        </Chip>
                      )}
                      {secondaryMinistries.map((m) => m && <Chip key={m.id}>{m.shortName}</Chip>)}
                    </ChipRow>
                  )}
                  <CaseManagerSection project={project} ministry={primaryMinistry} isStaffViewer={isCaseManagerAdmin} />
                  <ReviewingOfficerSection
                    project={project}
                    canEdit={canEditReviewingOfficer}
                    canView={canViewReviewingOfficer}
                  />
                  {/* Request Association (Phase 6) — a ministry_admin/government viewer whose own
                   *  ministry is a stranger to this project can ask to be added as a secondary
                   *  beneficiary; hidden entirely for their own ministry's projects or once already
                   *  a listed beneficiary. */}
                  {(realRole === "ministry_admin" || isGovernmentReal) && viewerMinistryId && viewerUserId && (
                    <RequestAssociationButton project={project} actorMinistryId={viewerMinistryId} />
                  )}
                  {/* Request Amendment (Platform Feedback Batch v4, Phase 8) — a government
                   *  reviewer's governed change-request path on their own ministry's already
                   *  locked (approved/published) project. Two-stage: their own ministry_admin
                   *  decides first, then ZIDA Admin/Super Admin makes the final call (see
                   *  POST /api/projects/[id]/amendment-request). ministry_admin doesn't need this
                   *  — they keep direct-edit-with-reason authority on their own ministry's
                   *  projects via the ordinary PATCH path, unchanged. */}
                  {isGovernmentReal &&
                    viewerMinistryId &&
                    projectMatchesMinistry(project, viewerMinistryId) &&
                    (project.projectStatus === "approved" || project.projectStatus === "published") && (
                      <div>
                        <p className="text-[11px] uppercase tracking-wide mb-1.5" style={{ color: "var(--color-text-muted)" }}>
                          Request Amendment
                        </p>
                        <RequestAmendmentForm project={project} />
                      </div>
                    )}
                </div>

                {/* Engaged Investors — pulled from the same store the Deal Room Engagements page
                 *  reads (already role-scoped server-side: a qualified investor only ever
                 *  receives their own engagements here, admin/super_admin/government see all —
                 *  see GET /api/engagements). */}
                <div>
                  <p className="text-[11px] uppercase tracking-wide mb-1.5 flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
                    <Users className="h-3 w-3" /> Engaged Investors ({engagements.length})
                  </p>
                  {engagements.length === 0 ? (
                    <p className="text-sm italic" style={{ color: "var(--color-text-muted)" }}>
                      No engagements recorded yet.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {engagements.map((e) => (
                        <li key={e.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedEngagementId(e.id)}
                            className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-white/[0.06]"
                            style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                            title="View engagement details, MOU status, and messages"
                          >
                            <div className="min-w-0">
                              <p className="text-sm text-white truncate">{e.investorName}</p>
                              {e.investorOrganization && (
                                <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                                  {e.investorOrganization}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <EngagementStatusPill status={e.status} />
                              <ChevronRight className="h-3.5 w-3.5" style={{ color: "var(--color-text-muted)" }} />
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {workflowRole === null && (
                    <p className="text-xs mt-1.5" style={{ color: "var(--color-text-muted)" }}>
                      You only see your own engagement here — other investors&apos; details stay confidential.
                    </p>
                  )}
                </div>

                {(project.documentRecords?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide mb-1.5 flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
                      <FileText className="h-3 w-3" /> Documents ({project.documentRecords!.length})
                    </p>
                    <ul className="space-y-1.5">
                      {project.documentRecords!.map((doc) => {
                        const isStaffViewer = isAdminReal || isSuperAdminReal;
                        const level = accessLevelForRole(realRole);
                        const hasLevelAccess = isStaffViewer || canAccessVisibilityLevel(level, doc.visibilityLevel);
                        const needsNda =
                          !isStaffViewer && doc.visibilityLevel === "qualified_investor" && realRole === "qualified" && !ndaAcceptedAt;
                        const unlocked = hasLevelAccess && !needsNda;
                        return (
                          <li
                            key={doc.id}
                            className="flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5"
                            style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                          >
                            <span className="min-w-0 truncate text-sm text-white">{doc.title}</span>
                            {unlocked ? (
                              <span className="flex items-center gap-2 shrink-0">
                                <a
                                  href={`/api/projects/${project.id}/documents/${doc.id}/download?mode=preview`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs font-medium hover:underline"
                                  style={{ color: "var(--color-text-muted)" }}
                                >
                                  <Eye className="h-3 w-3" /> Preview
                                </a>
                                <a
                                  href={`/api/projects/${project.id}/documents/${doc.id}/download`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-medium hover:underline"
                                  style={{ color: "var(--color-gold)" }}
                                >
                                  Download
                                </a>
                              </span>
                            ) : (
                              <span className="shrink-0 text-[10px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                                {needsNda ? "NDA required" : "Restricted"}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <div>
                  <p className="text-[11px] uppercase tracking-wide mb-1" style={{ color: "var(--color-text-muted)" }}>
                    Description
                  </p>
                  <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    {project.description}
                  </p>
                </div>
                {project.scope.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide mb-1" style={{ color: "var(--color-text-muted)" }}>
                      Scope
                    </p>
                    <ul className="text-sm list-disc pl-4 space-y-0.5" style={{ color: "var(--color-text-secondary)" }}>
                      {project.scope.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {project.developmentImpact.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide mb-1" style={{ color: "var(--color-text-muted)" }}>
                      Development Impact &amp; Rationale
                    </p>
                    <ul className="text-sm list-disc pl-4 space-y-0.5" style={{ color: "var(--color-text-secondary)" }}>
                      {project.developmentImpact.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {project.reviewerNotes && (
                  <div
                    className="rounded-md p-3 text-sm"
                    style={{ backgroundColor: "rgba(255, 211, 0, 0.1)", color: "#fde047" }}
                  >
                    <span className="font-medium">Reviewer notes: </span>
                    {project.reviewerNotes}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="timeline" className="mt-4">
                {/* Real chronological history from audit_logs (GET /api/projects/[id]/history) —
                 *  every round of review/changes-requested/approval is its own row here, instead
                 *  of the single latest-snapshot fields (reviewedAt/approvedAt, etc.) silently
                 *  overwriting prior rounds like before. */}
                <ActivityFeed entries={history} isLoading={historyLoading} emptyMessage="No recorded history yet." />
              </TabsContent>

              <TabsContent value="messages" className="mt-4">
                {/* Communication Hub entry point (#2/#6 of the Deal Room feedback) — the general
                 *  project-level thread. Staff see every investor's thread; a qualified investor
                 *  sees only their own (see GET /api/projects/[id]/messages). */}
                <MessageThread
                  projectId={project.id}
                  isStaff={Boolean(workflowRole)}
                  // Ministry Desk management dashboard plan, Part 3 — a ministry_admin browsing a
                  // project outside their own ministry (Part 2's "My Ministry Only" toggle off) has
                  // no workflowRole here and would just 403 if they tried to post; keep the thread
                  // view-only rather than showing a composer that fails. On their own ministry's
                  // projects, resolveProjectWorkflowRole grants a real workflowRole (isStaff=true).
                  readOnly={realRole === "ministry_admin" && !workflowRole}
                  emptyMessage="No questions yet. Ask ZIDA anything about this project below."
                />
              </TabsContent>

              {workflowRole && (
                <TabsContent value="actions" className="mt-4">
                  <GovernanceChecklist project={project} sectorName={sector?.shortName ?? sector?.name} />
                  <ReviewActions
                    project={project}
                    role={workflowRole}
                    onAction={(status, notes) => onAction?.(project.id, status, notes)}
                  />
                </TabsContent>
              )}
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>

    {/* Stacked on top of the project drawer — Engaged Investors rows drill into the same
     *  Engagement Detail drawer the Deal Room Engagements page uses, keeping the MOU
     *  lifecycle and engagement-scoped messages in one shared surface. */}
    <EngagementDetailDrawer
      engagement={selectedEngagement}
      projectTitle={project?.title}
      onClose={() => setSelectedEngagementId(null)}
      // Ministry Desk management dashboard plan, Part 3 — fixes a real inconsistency: this nested
      // drawer used to pass isStaff={Boolean(workflowRole)} with no readOnly, which accidentally
      // granted a ministry_admin *full* engagement-approval authority here, contradicting the
      // read-only stance the dedicated /ministry/engagements page enforces. Read + reply only.
      isStaff={realRole === "ministry_admin" ? false : Boolean(workflowRole)}
      readOnly={realRole === "ministry_admin"}
      canMessage={realRole === "ministry_admin"}
      onUpdated={refreshEngagements}
    />

    {project && isInvestor && (
      <NewEngagementWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        projects={[{ id: project.id, title: project.title }]}
        defaultProjectId={project.id}
        defaultInvestorName={name ?? ""}
        canSelfInitiate
        addEngagement={addEngagement}
        publishEngagement={publishEngagement}
        onCreated={(created) => {
          setWizardOpen(false);
          setSelectedEngagementId(created.id);
        }}
      />
    )}
    </>
  );
}
