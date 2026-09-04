"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Archive,
  ArchiveRestore,
  CalendarClock,
  Clock,
  FileText,
  Info,
  Lock,
  MessageSquare,
  Pencil,
  Send,
  Trash2,
  UserCog,
  Undo2,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { EngagementStatusPill } from "@/components/deal-room/engagement-status-pill";
import { MouPanel } from "@/components/deal-room/mou-panel";
import { MessageThread } from "@/components/deal-room/message-thread";
import { EngagementDelegatePicker } from "@/components/deal-room/engagement-delegate-picker";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ElevatedTabsList, ElevatedTabsTrigger } from "@/components/ui/elevated-tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { canSelfDeleteEngagement, canWithdrawEngagement, isDraftEditable } from "@/lib/governance/engagement-workflow";
import type { CorrectionField, FollowThroughStatus, InvestorEngagement } from "@/lib/types";

const FOLLOW_THROUGH_LABELS: Record<FollowThroughStatus, string> = {
  on_track: "On Track",
  at_risk: "At Risk",
  non_responsive: "Non-Responsive",
  completed: "Completed",
};

const CORRECTION_FIELD_OPTIONS: { value: CorrectionField; label: string; current: (e: InvestorEngagement) => string | null | undefined }[] = [
  { value: "investorOrganization", label: "Organization", current: (e) => e.investorOrganization },
  { value: "ticketSize", label: "Indicative ticket size", current: (e) => e.ticketSize },
  { value: "signatoryTitle", label: "Signatory title", current: (e) => e.signatoryTitle },
];

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

/** Muted label for dark dialogs (dialogs portal outside .dashboard-shell, so an explicit color
 *  is needed for legibility). */
function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-medium mb-1 block" style={{ color: "var(--color-text-muted)" }}>
      {children}
    </label>
  );
}

/**
 * Primary-contact clarity (Team Ministry Traceability Batch, Phase 8, item 2) — advisory-only
 * "who's actually driving replies right now" signal. Only rendered when a Delegate is assigned
 * (with no Delegate there's no ambiguity to resolve). Either the owner or the Delegate may switch
 * it themselves; staff and any other viewer see the same badge read-only.
 */
function PrimaryContactControl({
  engagement,
  canSwitch,
}: {
  engagement: InvestorEngagement;
  canSwitch: boolean;
}) {
  const [saving, setSaving] = useState(false);
  if (!engagement.assignedUserId || !engagement.userId) return null;

  const effective = engagement.primaryContactUserId ?? engagement.userId;
  const isOwnerPrimary = effective === engagement.userId;

  const switchTo = async (userId: string) => {
    if (userId === effective) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/engagements/${engagement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryContactUserId: userId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Primary contact updated");
      window.dispatchEvent(new CustomEvent("zim:engagement-updated"));
    } catch {
      toast.error("Could not update primary contact");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 flex items-center justify-between gap-2">
      <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
        Primary contact:{" "}
        <strong className="text-white">{isOwnerPrimary ? "Owner" : "Delegate"}</strong>
      </span>
      {canSwitch && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={saving || isOwnerPrimary}
            onClick={() => switchTo(engagement.userId!)}
            className="text-[10px] font-medium px-2 py-1 rounded border transition-colors disabled:opacity-40"
            style={{
              borderColor: isOwnerPrimary ? "var(--color-gold)" : "var(--color-sovereign-border)",
              color: isOwnerPrimary ? "var(--color-gold)" : "var(--color-text-muted)",
            }}
          >
            Owner
          </button>
          <button
            type="button"
            disabled={saving || !isOwnerPrimary}
            onClick={() => switchTo(engagement.assignedUserId!)}
            className="text-[10px] font-medium px-2 py-1 rounded border transition-colors disabled:opacity-40"
            style={{
              borderColor: !isOwnerPrimary ? "var(--color-gold)" : "var(--color-sovereign-border)",
              color: !isOwnerPrimary ? "var(--color-gold)" : "var(--color-text-muted)",
            }}
          >
            Delegate
          </button>
        </div>
      )}
    </div>
  );
}

/** Staff-settable administrative tag (Institutional Compliance Dossier round) — "investor signed
 *  the MOU but doesn't follow up" lever, independent of the formal compliance status workflow.
 *  admin/super_admin edit here; read-only elsewhere (e.g. the Users & Roles dossier's Portfolio tab). */
function FollowThroughControl({
  engagement,
  canEdit,
  onUpdated,
}: {
  engagement: InvestorEngagement;
  canEdit: boolean;
  onUpdated?: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState<FollowThroughStatus | "">(engagement.followThroughStatus ?? "");

  useEffect(() => {
    setValue(engagement.followThroughStatus ?? "");
  }, [engagement.id, engagement.followThroughStatus]);

  if (!canEdit && !engagement.followThroughStatus) return null;

  const save = async (next: FollowThroughStatus) => {
    setValue(next);
    setSaving(true);
    try {
      const res = await fetch(`/api/engagements/${engagement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followThroughStatus: next }),
      });
      if (!res.ok) throw new Error();
      toast.success("Follow-through status updated.");
      onUpdated?.();
    } catch {
      toast.error("Could not update follow-through status.");
      setValue(engagement.followThroughStatus ?? "");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-panel p-3">
      <p className="text-[11px] uppercase tracking-wide mb-1.5" style={{ color: "var(--color-text-muted)" }}>
        Follow-Through Status
      </p>
      {canEdit ? (
        <select
          className="dashboard-input"
          value={value}
          disabled={saving}
          onChange={(e) => save(e.target.value as FollowThroughStatus)}
        >
          <option value="" disabled>
            Not yet set
          </option>
          {(Object.keys(FOLLOW_THROUGH_LABELS) as FollowThroughStatus[]).map((key) => (
            <option key={key} value={key}>
              {FOLLOW_THROUGH_LABELS[key]}
            </option>
          ))}
        </select>
      ) : (
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {engagement.followThroughStatus ? FOLLOW_THROUGH_LABELS[engagement.followThroughStatus] : "Not yet set"}
        </p>
      )}
    </div>
  );
}

interface EngagementDetailDrawerProps {
  engagement: InvestorEngagement | null;
  projectTitle?: string;
  onClose: () => void;
  /** Staff (admin/super_admin/government) get full drafting/approval controls in the MOU tab and
   *  can post internal notes in Messages — a qualified investor only ever sees their own row
   *  (enforced server-side too, see GET /api/engagements and .../mou). */
  isStaff: boolean;
  /** Read-only oversight viewer (ministry_admin — Subject Dropdown + Ministry Engagements plan,
   *  Part B): full visibility (Details fields, MOU tab, Messages incl. internal notes) but no
   *  composer, no self-service/correction/call/deletion actions, and Follow-Through shown
   *  read-only. Pass alongside `isStaff={false}`. */
  readOnly?: boolean;
  /** Ministry Desk management dashboard plan, Part 3 — decouples "read-only for governance
   *  actions" from "read-only for messaging" so a ministry_admin can read + reply in the Messages
   *  tab (their Communication Hub) without gaining MOU/status authority. Only affects the Messages
   *  tab; Details/MOU keep using `isStaff`/`readOnly` untouched. Pass alongside `readOnly`. */
  canMessage?: boolean;
  /** Called after a successful draft edit / publish / correction so the parent list refreshes. */
  onUpdated?: () => void;
  /** Which tab opens first — the MOU registry (Platform Feedback Batch v3, Phase 8) opens straight
   *  to "mou" since that's the entire reason a row was clicked there; every other caller keeps the
   *  "details" default. */
  defaultTab?: "details" | "mou" | "messages";
}

/** Row-level drill-down for a single investor engagement — makes each Engagements row clickable
 *  and expandable (per the Deal Room feedback), and is where the MOU lifecycle (see MouPanel)
 *  and the engagement-scoped Communication Hub thread live. The Details tab additionally hosts the
 *  Draft-Lock workflow: the owning investor (or staff, on their behalf) edits while `draft`,
 *  publishes (one-way lock; investors additionally certify), then can only file a correction. */
export function EngagementDetailDrawer({
  engagement,
  projectTitle,
  onClose,
  isStaff,
  readOnly = false,
  canMessage = false,
  onUpdated,
  defaultTab,
}: EngagementDetailDrawerProps) {
  return (
    <Sheet open={Boolean(engagement)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl">
        {engagement && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2 mb-1">
                <EngagementStatusPill status={engagement.status} />
                {engagement.archivedAt && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{ backgroundColor: "rgba(148,163,184,0.15)", color: "var(--color-text-muted)" }}
                  >
                    <Archive className="h-3 w-3" /> Archived
                  </span>
                )}
              </div>
              <SheetTitle>{engagement.investorName}</SheetTitle>
              <SheetDescription>
                {engagement.investorOrganization ? `${engagement.investorOrganization} — ` : ""}
                {projectTitle ?? "Project engagement"}
              </SheetDescription>
            </SheetHeader>

            {/* Keyed by engagement id so `defaultTab` (e.g. the MOU registry always opening
             *  straight to "mou") re-applies correctly when a different row is clicked while the
             *  drawer is already open, rather than inheriting whatever tab was last active. */}
            <Tabs key={engagement.id} defaultValue={defaultTab ?? "details"}>
              <ElevatedTabsList>
                <ElevatedTabsTrigger value="details" icon={Info}>Details</ElevatedTabsTrigger>
                <ElevatedTabsTrigger value="mou" icon={FileText}>MOU</ElevatedTabsTrigger>
                <ElevatedTabsTrigger value="messages" icon={MessageSquare}>Messages</ElevatedTabsTrigger>
              </ElevatedTabsList>

              <TabsContent value="details" className="mt-4">
                <EngagementDetailsTab
                  engagement={engagement}
                  isStaff={isStaff}
                  readOnly={readOnly}
                  onUpdated={onUpdated}
                  onClose={onClose}
                />
              </TabsContent>

              <TabsContent value="mou" className="mt-4">
                <MouPanel engagementId={engagement.id} investorName={engagement.investorName} />
              </TabsContent>

              <TabsContent value="messages" className="mt-4 space-y-3">
                {engagement.assignedUserId && (
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    Primary contact:{" "}
                    <strong className="text-white">
                      {(engagement.primaryContactUserId ?? engagement.userId) === engagement.userId ? "Owner" : "Delegate"}
                    </strong>
                  </p>
                )}
                <MessageThread
                  projectId={engagement.projectId}
                  engagementId={engagement.id}
                  isStaff={isStaff || canMessage}
                  readOnly={readOnly && !canMessage}
                  emptyMessage="No messages on this engagement yet."
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function EngagementDetailsTab({
  engagement,
  isStaff,
  readOnly = false,
  onUpdated,
  onClose,
}: {
  engagement: InvestorEngagement;
  isStaff: boolean;
  readOnly?: boolean;
  onUpdated?: () => void;
  onClose?: () => void;
}) {
  const { userId, role } = useAuth();
  const canEditFollowThrough = role === "admin" || role === "super_admin";
  const isOwner = !isStaff && Boolean(engagement.userId) && engagement.userId === userId;
  // Delegate model (Team Ministry Traceability Batch, Phase 5) — a Team Member the owner assigned
  // equal authority to on this one engagement; matches the widened PATCH ownership gate.
  const isDelegate = !isStaff && Boolean(engagement.assignedUserId) && engagement.assignedUserId === userId;
  // The owning investor, their assigned Delegate, and staff (on the investor's behalf) may edit a
  // draft; only the investor's own publish requires a certification attestation.
  const canEdit = isDraftEditable(engagement.status) && (isOwner || isDelegate || isStaff);

  useEffect(() => {
    const handler = () => onUpdated?.();
    window.addEventListener("zim:engagement-updated", handler);
    return () => window.removeEventListener("zim:engagement-updated", handler);
  }, [onUpdated]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [deleteRequestOpen, setDeleteRequestOpen] = useState(false);
  const [deleteRequestReason, setDeleteRequestReason] = useState("");

  // Draft edit form state (seeded from the engagement; re-seeded when a different row opens).
  const [organization, setOrganization] = useState(engagement.investorOrganization ?? "");
  const [ticketSize, setTicketSize] = useState(engagement.ticketSize ?? "");
  const [signatoryTitle, setSignatoryTitle] = useState(engagement.signatoryTitle ?? "");
  const [notes, setNotes] = useState(engagement.notes ?? "");
  const [saving, setSaving] = useState(false);

  const [publishOpen, setPublishOpen] = useState(false);
  const [certified, setCertified] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionField, setCorrectionField] = useState<CorrectionField | "">("");
  const [correctionProposed, setCorrectionProposed] = useState("");

  const [callOpen, setCallOpen] = useState(false);
  const [callTime, setCallTime] = useState("");
  const [callMode, setCallMode] = useState("Video call");
  const [callNote, setCallNote] = useState("");

  useEffect(() => {
    setOrganization(engagement.investorOrganization ?? "");
    setTicketSize(engagement.ticketSize ?? "");
    setSignatoryTitle(engagement.signatoryTitle ?? "");
    setNotes(engagement.notes ?? "");
    setCertified(false);
  }, [engagement.id, engagement.investorOrganization, engagement.ticketSize, engagement.signatoryTitle, engagement.notes]);

  async function patch(payload: Record<string, unknown>): Promise<boolean> {
    setSaving(true);
    try {
      const res = await fetch(`/api/engagements/${engagement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Could not save changes.");
        return false;
      }
      onUpdated?.();
      return true;
    } finally {
      setSaving(false);
    }
  }

  async function saveDraft() {
    if (await patch({ investorOrganization: organization, ticketSize, signatoryTitle, notes })) {
      toast.success("Draft saved.");
    }
  }

  // Investor publish: goes through the certification dialog (needs signatory title + attestation).
  async function publishAsInvestor() {
    if (!signatoryTitle.trim()) {
      toast.error("A signatory title is required to publish.");
      return;
    }
    const ok = await patch({
      status: "submitted",
      certified: true,
      investorOrganization: organization,
      ticketSize,
      signatoryTitle,
      notes,
    });
    if (ok) {
      setPublishOpen(false);
      toast.success("Engagement published and locked for ZIDA review.");
    }
  }

  // Staff publish: direct, no certification attestation (they act on the investor's behalf).
  async function publishAsStaff() {
    const ok = await patch({ status: "submitted", investorOrganization: organization, ticketSize, signatoryTitle, notes });
    if (ok) toast.success("Engagement published.");
  }

  async function proposeCall() {
    if (!callTime.trim()) {
      toast.error("Please choose a proposed date and time.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/engagements/${engagement.id}/schedule-call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposedTime: new Date(callTime).toISOString(), callMode: callMode || undefined, note: callNote }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Could not propose the call.");
        return;
      }
      setCallOpen(false);
      setCallTime("");
      setCallNote("");
      toast.success("Call proposal sent.");
      onUpdated?.();
    } finally {
      setSaving(false);
    }
  }

  async function requestCorrection() {
    if (!correctionReason.trim()) {
      toast.error("Please describe the correction needed.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/engagements/${engagement.id}/correction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: correctionReason,
          field: correctionField || undefined,
          proposedValue: correctionField ? correctionProposed : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Could not submit the correction request.");
        return;
      }
      setCorrectionOpen(false);
      setCorrectionReason("");
      setCorrectionField("");
      setCorrectionProposed("");
      onUpdated?.();
      toast.success("Correction request sent to the ZIDA deal team.");
    } finally {
      setSaving(false);
    }
  }

  // Cosmetic, reversible, allowed at any status — doesn't touch the compliance workflow.
  async function toggleArchive() {
    if (await patch({ archived: !engagement.archivedAt })) {
      toast.success(engagement.archivedAt ? "Engagement unarchived." : "Engagement archived.");
    }
  }

  async function withdrawToDraft() {
    if (await patch({ action: "withdraw" })) {
      setWithdrawOpen(false);
      toast.success("Engagement withdrawn to draft — you can now edit and republish it.");
    }
  }

  async function deleteEngagement() {
    setSaving(true);
    try {
      const res = await fetch(`/api/engagements/${engagement.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Could not delete this engagement.");
        return;
      }
      setDeleteOpen(false);
      toast.success("Engagement deleted.");
      onUpdated?.();
      onClose?.();
    } finally {
      setSaving(false);
    }
  }

  async function requestDeletion() {
    if (deleteRequestReason.trim().length < 40) {
      toast.error("Please provide a comprehensive justification (at least 40 characters).");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/engagements/${engagement.id}/delete-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: deleteRequestReason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Could not submit the deletion request.");
        return;
      }
      setDeleteRequestOpen(false);
      setDeleteRequestReason("");
      onUpdated?.();
      toast.success("Deletion request sent to ZIDA and Platform Admin for review. Government has been notified for transparency.");
    } finally {
      setSaving(false);
    }
  }

  // The governed deletion request is available to the owning investor OR staff (admin/super_admin
  // acting on the investor's behalf) — unlike the plain self-service actions below, which are
  // owner-only.
  const deletionRequestControl =
    engagement.status === "approved" && (isOwner || isStaff) ? (
      engagement.deleteRequestStatus === "pending" ? (
        <span
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs"
          style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#93c5fd" }}
        >
          <Clock className="h-3.5 w-3.5" /> Deletion request pending review
        </span>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDeleteRequestOpen(true)}
          disabled={saving}
          className="text-red-400 border-red-400/30 hover:bg-red-500/10 hover:text-red-300"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" /> Request Deletion
        </Button>
      )
    ) : null;

  const selfServiceActions = isOwner ? (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={toggleArchive} disabled={saving}>
        {engagement.archivedAt ? <ArchiveRestore className="h-3.5 w-3.5 mr-1" /> : <Archive className="h-3.5 w-3.5 mr-1" />}
        {engagement.archivedAt ? "Unarchive" : "Archive"}
      </Button>
      {canWithdrawEngagement(engagement.status) && (
        <Button variant="outline" size="sm" onClick={() => setWithdrawOpen(true)} disabled={saving}>
          <Undo2 className="h-3.5 w-3.5 mr-1" /> Withdraw to Draft
        </Button>
      )}
      {canSelfDeleteEngagement(engagement.status) && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDeleteOpen(true)}
          disabled={saving}
          className="text-red-400 border-red-400/30 hover:bg-red-500/10 hover:text-red-300"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
        </Button>
      )}
      {deletionRequestControl}
    </div>
  ) : null;

  const selfServiceDialogs = (
    <>
      <Dialog open={deleteRequestOpen} onOpenChange={setDeleteRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request deletion of this approved engagement</DialogTitle>
            <DialogDescription>
              Approved engagements are a credibility record ZIDA and government stakeholders rely on, so deletion
              requires a written justification and goes to <strong>ZIDA Admin and Platform Admin for review</strong> —
              they may approve, decline, or request a briefing before deciding. Designated government officials are
              notified for transparency but don&apos;t adjudicate the request.
            </DialogDescription>
          </DialogHeader>
          <textarea
            className="dashboard-input min-h-[96px]"
            rows={4}
            placeholder="Explain why this engagement should be deleted (at least 40 characters)…"
            value={deleteRequestReason}
            onChange={(e) => setDeleteRequestReason(e.target.value)}
          />
          <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            {deleteRequestReason.trim().length}/40 characters minimum
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteRequestOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={requestDeletion}
              disabled={saving || deleteRequestReason.trim().length < 40}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              Submit Deletion Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw to draft?</DialogTitle>
            <DialogDescription>
              This pulls the engagement out of the ZIDA review queue and returns it to draft so you can edit it. You&apos;ll
              need to certify and publish again when it&apos;s ready.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setWithdrawOpen(false)}>
              Cancel
            </Button>
            <Button onClick={withdrawToDraft} disabled={saving}>
              Withdraw to Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this engagement?</DialogTitle>
            <DialogDescription>
              This removes the engagement from your pipeline. This action cannot be undone from the UI.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={deleteEngagement}
              disabled={saving}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              Delete Engagement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  // Delegate model (Team Ministry Traceability Batch, Phase 5) — an interactive picker for the
  // true owner (assign/unassign), a plain "Delegate: {name}" chip for the assigned Delegate/staff
  // viewing the same record. Visible regardless of draft/locked status — it's roster metadata, not
  // part of the compliance content itself.
  const delegateSection = (
    <>
      {isOwner ? (
        <EngagementDelegatePicker engagementId={engagement.id} assignedUserId={engagement.assignedUserId} isOwner />
      ) : engagement.assignedUserId && (isDelegate || isStaff) ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 flex items-center gap-2">
          <UserCog className="h-3.5 w-3.5" style={{ color: "var(--color-text-muted)" }} />
          <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            {isDelegate ? "You are the Delegate on this engagement — full authority alongside the owner." : "A Delegate is assigned to this engagement."}
          </span>
        </div>
      ) : null}
      <PrimaryContactControl engagement={engagement} canSwitch={isOwner || isDelegate} />
    </>
  );

  // ---- Editable draft view (owner, delegate, or staff) ----
  if (canEdit) {
    return (
      <div className="space-y-4">
        <div
          className="rounded-md px-3 py-2 text-xs flex items-start gap-2"
          style={{ backgroundColor: "rgba(148,163,184,0.12)", color: "var(--color-text-secondary)" }}
        >
          <Pencil className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            This engagement is a <strong>draft</strong>.{" "}
            {isStaff
              ? "Refine the details below on the investor's behalf, then publish to move it into review."
              : "Only you, your delegate (if any), and the ZIDA deal team can see it. Refine the details below, then certify and publish to submit it for review."}
          </span>
        </div>

        {delegateSection}

        {isStaff && <FollowThroughControl engagement={engagement} canEdit={canEditFollowThrough} onUpdated={onUpdated} />}

        <div className="space-y-3">
          <div>
            <FieldLabel htmlFor="eng-org">Organization</FieldLabel>
            <input id="eng-org" className="dashboard-input" value={organization} onChange={(e) => setOrganization(e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="eng-ticket">Indicative ticket size</FieldLabel>
            <input id="eng-ticket" className="dashboard-input" placeholder="e.g. USD 10-15M" value={ticketSize} onChange={(e) => setTicketSize(e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="eng-sig">Authorized signatory title</FieldLabel>
            <input id="eng-sig" className="dashboard-input" placeholder="e.g. Managing Director" value={signatoryTitle} onChange={(e) => setSignatoryTitle(e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="eng-notes">Notes / investment thesis</FieldLabel>
            <textarea id="eng-notes" className="dashboard-input min-h-[96px]" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button variant="secondary" onClick={saveDraft} disabled={saving}>
            Save Draft
          </Button>
          {isStaff ? (
            <Button onClick={publishAsStaff} disabled={saving}>
              <Send className="h-4 w-4 mr-1.5" /> Publish
            </Button>
          ) : (
            <Button onClick={() => setPublishOpen(true)} disabled={saving}>
              <Send className="h-4 w-4 mr-1.5" /> Certify &amp; Publish
            </Button>
          )}
        </div>

        <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Certify &amp; publish engagement</DialogTitle>
              <DialogDescription>
                Publishing submits this engagement to the ZIDA deal team and <strong>locks it</strong>. After this point
                the record becomes immutable — any change must be made through a formal correction request.
              </DialogDescription>
            </DialogHeader>
            <label className="flex items-start gap-2 text-sm mt-2" style={{ color: "var(--color-text-secondary)" }}>
              <input type="checkbox" className="mt-0.5" checked={certified} onChange={(e) => setCertified(e.target.checked)} />
              <span>
                I certify, as <strong>{signatoryTitle || "the authorized signatory"}</strong>, that the information in
                this engagement is accurate and that I am authorized to submit it on behalf of{" "}
                {organization || "my organization"}.
              </span>
            </label>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setPublishOpen(false)}>
                Cancel
              </Button>
              <Button onClick={publishAsInvestor} disabled={!certified || saving}>
                Publish &amp; Lock
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {selfServiceActions && <div className="pt-2 border-t border-white/10">{selfServiceActions}</div>}
        {selfServiceDialogs}
      </div>
    );
  }

  // ---- Read-only view (locked record, or non-owner) ----
  return (
    <div className="space-y-3">
      {isOwner && !isDraftEditable(engagement.status) && (
        <div
          className="rounded-md px-3 py-2 text-xs flex items-start gap-2"
          style={{ backgroundColor: "rgba(255,211,0,0.1)", color: "var(--color-text-secondary)" }}
        >
          <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "var(--color-gold)" }} />
          <span>
            This engagement is locked and under ZIDA review. It can no longer be edited directly — use{" "}
            <strong>Request Correction</strong> to propose a change.
          </span>
        </div>
      )}

      {delegateSection}

      {(isStaff || readOnly) && (
        <FollowThroughControl engagement={engagement} canEdit={canEditFollowThrough} onUpdated={onUpdated} />
      )}

      <Field label="Investor" value={engagement.investorName} />
      <Field label="Organization" value={engagement.investorOrganization} />
      <Field label="Indicative Ticket Size" value={engagement.ticketSize} />
      <Field label="Authorized Signatory" value={engagement.signatoryTitle} />
      <Field label="Status" value={engagement.status.replace(/_/g, " ")} />
      <Field label="Notes" value={engagement.notes} />
      {engagement.certifiedAt && (
        <Field label="Certified & Published" value={new Date(engagement.certifiedAt).toLocaleString()} />
      )}
      <Field label="Logged" value={new Date(engagement.createdAt).toLocaleString()} />
      <Field label="Last Updated" value={new Date(engagement.updatedAt).toLocaleString()} />

      {(isOwner || isDelegate || isStaff) && (
        <div className="pt-1 flex flex-wrap gap-2">
          {(isOwner || isDelegate) && !isDraftEditable(engagement.status) && (
            <Button variant="outline" onClick={() => setCorrectionOpen(true)}>
              Request Correction
            </Button>
          )}
          <Button variant="outline" onClick={() => setCallOpen(true)}>
            <CalendarClock className="h-4 w-4" /> Propose a Call
          </Button>
          {isStaff && deletionRequestControl}
        </div>
      )}

      {selfServiceActions && <div className="pt-1 border-t border-white/10 mt-2">{selfServiceActions}</div>}
      {selfServiceDialogs}

      <Dialog open={callOpen} onOpenChange={setCallOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Propose a call</DialogTitle>
            <DialogDescription>
              Suggest a date and time. This posts an interactive card in the engagement thread that the other party can
              accept or decline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <FieldLabel htmlFor="callTime">Proposed date &amp; time</FieldLabel>
              <input
                id="callTime"
                type="datetime-local"
                className="dashboard-input"
                value={callTime}
                onChange={(e) => setCallTime(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel htmlFor="callMode">Mode</FieldLabel>
              <select id="callMode" className="dashboard-input" value={callMode} onChange={(e) => setCallMode(e.target.value)}>
                <option>Video call</option>
                <option>Phone call</option>
                <option>In person</option>
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="callNote">Note (optional)</FieldLabel>
              <textarea
                id="callNote"
                className="dashboard-input min-h-[72px]"
                rows={2}
                placeholder="e.g. To walk through the financial model and next steps."
                value={callNote}
                onChange={(e) => setCallNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCallOpen(false)}>
              Cancel
            </Button>
            <Button onClick={proposeCall} disabled={saving}>
              Send Proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={correctionOpen} onOpenChange={setCorrectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a correction</DialogTitle>
            <DialogDescription>
              Describe the change you need. This is sent to the ZIDA deal team and recorded in the engagement timeline;
              the original locked record is preserved.
            </DialogDescription>
          </DialogHeader>
          <textarea
            className="dashboard-input min-h-[96px]"
            rows={4}
            placeholder="e.g. The indicative ticket size should read USD 12M, not USD 10M."
            value={correctionReason}
            onChange={(e) => setCorrectionReason(e.target.value)}
          />

          <div className="mt-3 space-y-2">
            <FieldLabel htmlFor="correctionField">Propose a specific change (optional)</FieldLabel>
            <select
              id="correctionField"
              className="dashboard-input"
              value={correctionField}
              onChange={(e) => {
                const value = e.target.value as CorrectionField | "";
                setCorrectionField(value);
                const opt = CORRECTION_FIELD_OPTIONS.find((o) => o.value === value);
                setCorrectionProposed(opt ? opt.current(engagement) ?? "" : "");
              }}
            >
              <option value="">No specific field — describe above only</option>
              {CORRECTION_FIELD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {correctionField && (
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Current:{" "}
                  <span className="line-through">
                    {CORRECTION_FIELD_OPTIONS.find((o) => o.value === correctionField)?.current(engagement) || "—"}
                  </span>
                </p>
                <input
                  className="dashboard-input"
                  placeholder="Proposed new value"
                  value={correctionProposed}
                  onChange={(e) => setCorrectionProposed(e.target.value)}
                />
                <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>
                  If ZIDA approves, this value is applied to the engagement automatically.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCorrectionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={requestCorrection} disabled={saving}>
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
