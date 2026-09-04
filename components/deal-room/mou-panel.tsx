"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Download, FileDown, FileSignature, Lock, MessageSquare, Printer, RotateCcw } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useEngagementMou } from "@/lib/hooks/use-engagement-mou";
import { useMouFieldComments } from "@/lib/hooks/use-mou-field-comments";
import {
  MOU_STATUS_LABELS,
  MOU_STATUS_ORDER,
  canEditMouContent,
  isZidaApproverRole,
} from "@/lib/governance/mou-workflow";
import type { MouAction, MouContent, MouFieldComment, MouFormatting, MouSignatureMetadata } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CONTENT_FIELDS: Array<{ key: keyof Omit<MouContent, "termBullets">; label: string; placeholder: string }> = [
  { key: "parties", label: "Parties", placeholder: "ZIDA (on behalf of the Government of Zimbabwe) and [Investor / Organization]" },
  { key: "projectReference", label: "Project Reference", placeholder: "Project title / reference code" },
  { key: "indicativeCapital", label: "Indicative Capital", placeholder: "e.g. USD 12–15M" },
  { key: "effectiveDate", label: "Effective Date", placeholder: "YYYY-MM-DD" },
];

// Phase 7 — the base-template sections a standalone MOU document needs beyond the deal-specific
// terms above; rendered as full-width textareas since each holds a sentence or two of prose rather
// than a short value. Pre-filled with standard boilerplate by buildSeedContent() in
// lib/db/queries/mous.ts, so ZIDA only ever edits, never starts from a blank field.
const PROSE_FIELDS: Array<{ key: keyof Pick<MouContent, "purpose" | "scope" | "nonBindingStatement" | "governingLaw">; label: string; rows: number }> = [
  { key: "purpose", label: "Purpose", rows: 2 },
  { key: "scope", label: "Scope of Collaboration", rows: 2 },
  { key: "nonBindingStatement", label: "Non-Binding Clause", rows: 2 },
  { key: "governingLaw", label: "Governing Law", rows: 2 },
];

// Every field a per-field comment thread can attach to (Phase 7) — mirrors CONTENT_FIELDS +
// PROSE_FIELDS plus the two freeform textareas that don't fit the key/label array shape.
const FIELD_LABELS: Record<string, string> = {
  ...Object.fromEntries(CONTENT_FIELDS.map((f) => [f.key, f.label])),
  ...Object.fromEntries(PROSE_FIELDS.map((f) => [f.key, f.label])),
  termBullets: "Key Terms",
  specialConditions: "Special Conditions",
};

function fmtDate(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

interface MouPanelProps {
  engagementId: string;
  investorName: string;
}

/** Production-shaped MOU lifecycle surface — drafting -> in_review -> both_approved -> finalized
 *  -> ready_for_signature -> executed. Real e-signature capture is explicitly deferred: "executed"
 *  only records signer metadata via an attestation form (see the actions route). Used by both the
 *  Engagement Detail drawer and the Project Detail drawer's MOU tab. */
export function MouPanel({ engagementId, investorName }: MouPanelProps) {
  const { role } = useAuth();
  const { mou, engagementStatus, isLoading, updateDraft, runAction, error } = useEngagementMou(engagementId);
  const { comments, addComment, resolveComment } = useMouFieldComments(engagementId);

  const [draft, setDraft] = useState<MouContent | null>(null);
  const [termBulletsText, setTermBulletsText] = useState("");
  const [specialConditions, setSpecialConditions] = useState("");
  const [busy, setBusy] = useState(false);
  const [changesOpen, setChangesOpen] = useState(false);
  const [changesNotes, setChangesNotes] = useState("");
  const [executeOpen, setExecuteOpen] = useState(false);
  const [signature, setSignature] = useState<MouSignatureMetadata>({});
  const [commentField, setCommentField] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");

  const canEdit = role ? canEditMouContent(role) : false;
  const isZida = role ? isZidaApproverRole(role) : false;
  const isInvestor = role === "qualified";
  const canActAtAll = canEdit || isZida || isInvestor;

  const unresolvedCounts = comments.reduce<Record<string, number>>((acc, c) => {
    if (!c.resolvedAt) acc[c.fieldKey] = (acc[c.fieldKey] ?? 0) + 1;
    return acc;
  }, {});
  const activeThread = commentField ? comments.filter((c) => c.fieldKey === commentField) : [];

  function CommentBadge({ fieldKey }: { fieldKey: string }) {
    const count = unresolvedCounts[fieldKey] ?? 0;
    return (
      <button
        type="button"
        onClick={() => setCommentField(fieldKey)}
        className="inline-flex items-center gap-0.5 text-[10px] rounded px-1 py-0.5 transition-colors hover:bg-white/10"
        style={{ color: count > 0 ? "var(--color-gold)" : "var(--color-text-muted)" }}
        title="View/add review comments on this field"
      >
        <MessageSquare className="h-3 w-3" />
        {count > 0 && count}
      </button>
    );
  }

  async function submitComment() {
    if (!commentField || !newComment.trim()) return;
    setBusy(true);
    const ok = await addComment(commentField, newComment.trim());
    setBusy(false);
    if (ok) setNewComment("");
    else toast.error("Failed to post comment");
  }

  useEffect(() => {
    if (!mou) return;
    setDraft(null);
    setTermBulletsText((mou.content.termBullets ?? []).join("\n"));
    setSpecialConditions(mou.content.specialConditions ?? "");
    // Deliberately keyed on id/updatedAt rather than the whole `mou` object — re-syncing local
    // textarea state on every render (object identity always changes on refetch) would stomp
    // in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mou?.id, mou?.updatedAt]);

  if (isLoading && !mou) {
    return (
      <div className="space-y-2">
        <div className="dashboard-skeleton h-6 w-40" />
        <div className="dashboard-skeleton h-24 w-full" />
      </div>
    );
  }

  if (engagementStatus && engagementStatus !== "approved") {
    return (
      <div
        className="rounded-lg p-6 text-center"
        style={{ border: "1px dashed var(--color-sovereign-border)" }}
      >
        <FileSignature className="h-6 w-6 mx-auto mb-2" style={{ color: "var(--color-text-muted)" }} />
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          The MOU workflow activates once this engagement is <strong>Approved</strong>.
        </p>
        <p className="text-xs mt-1 capitalize" style={{ color: "var(--color-text-muted)" }}>
          Current engagement status: {engagementStatus.replace(/_/g, " ")}
        </p>
      </div>
    );
  }

  if (!mou) return null;

  const isDrafting = mou.status === "drafting";
  const isInReview = mou.status === "in_review";
  const isBothApproved = mou.status === "both_approved";
  const isFinalized = mou.status === "finalized";
  const isReadyForSignature = mou.status === "ready_for_signature";
  const isExecuted = mou.status === "executed";
  const contentLocked = !isDrafting;
  const displayContent = mou.contentSnapshot ?? mou.content;
  const currentStepIndex = MOU_STATUS_ORDER.indexOf(mou.status);

  const content = draft ?? mou.content;

  const setField = (key: keyof MouContent, value: string) => {
    setDraft({ ...content, [key]: value });
  };

  const hasDraftChanges =
    draft !== null &&
    (JSON.stringify(draft) !== JSON.stringify(mou.content) ||
      termBulletsText !== (mou.content.termBullets ?? []).join("\n") ||
      specialConditions !== (mou.content.specialConditions ?? ""));

  async function saveDraft() {
    setBusy(true);
    const ok = await updateDraft({
      content: {
        ...content,
        termBullets: termBulletsText.split("\n").map((s) => s.trim()).filter(Boolean),
        specialConditions,
      },
    });
    setBusy(false);
    if (ok) toast.success("MOU draft saved");
    else toast.error(error ?? "Failed to save draft");
  }

  async function updateFormatting(patch: Partial<MouFormatting>) {
    setBusy(true);
    const ok = await updateDraft({ formatting: patch });
    setBusy(false);
    if (!ok) toast.error(error ?? "Failed to update formatting");
  }

  async function act(action: MouAction, extra?: { notes?: string; signatureMetadata?: MouSignatureMetadata }) {
    setBusy(true);
    const ok = await runAction(action, extra);
    setBusy(false);
    if (ok) toast.success(actionSuccessLabel(action));
    else toast.error(error ?? "Action failed");
    return ok;
  }

  /**
   * A durable, retrievable copy of the frozen `contentSnapshot` — the interim answer to "give
   * investors/ZIDA a permanent record of the executed MOU" ahead of a full aggregated Personal
   * Document Vault page (tracked in BACKLOG.md). Client-side JSON export needs no new backend
   * endpoint or PDF pipeline; the full, real snapshot content is included, never truncated.
   */
  function downloadSnapshot() {
    if (!mou || !mou.contentSnapshot) return;
    const record = {
      recordType: "ZIDA Deal Room — Executed MOU Snapshot",
      engagementId,
      investorName,
      mouId: mou.id,
      status: mou.status,
      content: mou.contentSnapshot,
      formatting: mou.formatting,
      signatureMetadata: mou.signatureMetadata ?? null,
      finalizedAt: mou.finalizedAt,
      executedAt: mou.executedAt,
      downloadedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MOU-${investorName.replace(/[^a-z0-9]+/gi, "-")}-${engagementId.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function actionSuccessLabel(action: MouAction) {
    switch (action) {
      case "submit_for_review":
        return "Submitted for review";
      case "request_changes":
        return "Changes requested — back to drafting";
      case "approve":
        return "Approval recorded";
      case "finalize":
        return "MOU finalized — content is now locked";
      case "mark_ready_for_signature":
        return "Marked ready for signature";
      case "record_execution":
        return "Execution recorded";
      case "reopen":
        return "Reopened for edits";
    }
  }

  return (
    <div className="space-y-5">
      {/* Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {MOU_STATUS_ORDER.map((status, i) => {
          const done = i < currentStepIndex;
          const active = i === currentStepIndex;
          return (
            <div key={status} className="flex items-center shrink-0">
              <div
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap"
                style={{
                  backgroundColor: active ? "var(--color-gold)" : done ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.05)",
                  color: active ? "#1a1a1a" : done ? "#4ade80" : "var(--color-text-muted)",
                }}
              >
                {done && <Check className="h-3 w-3" />}
                {MOU_STATUS_LABELS[status]}
              </div>
              {i < MOU_STATUS_ORDER.length - 1 && (
                <div className="h-px w-3 shrink-0" style={{ backgroundColor: "var(--color-sovereign-border)" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Dual-approval status */}
      {!isExecuted && (
        <div className="grid grid-cols-2 gap-2">
          <ApprovalCard label="Investor" approvedAt={mou.investorApprovedAt} approvedBy={mou.investorApprovedBy} />
          <ApprovalCard label="ZIDA" approvedAt={mou.zidaApprovedAt} approvedBy={mou.zidaApprovedBy} />
        </div>
      )}

      {/* Content */}
      <div className="space-y-3 rounded-lg p-3" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid var(--color-sovereign-border)" }}>
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-wide flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
            {contentLocked && <Lock className="h-3 w-3" />} Terms
          </p>
          {contentLocked && (
            <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
              Locked{isFinalized || isReadyForSignature || isExecuted ? " — finalized content" : ""}
            </span>
          )}
        </div>

        {canEdit && isDrafting ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {CONTENT_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}>
                    {f.label} <CommentBadge fieldKey={f.key} />
                  </label>
                  <input
                    value={content[f.key] ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="dashboard-input"
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {PROSE_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}>
                    {f.label} <CommentBadge fieldKey={f.key} />
                  </label>
                  <textarea
                    value={content[f.key] ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    rows={f.rows}
                    className="dashboard-input"
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}>
                Term Bullets (one per line) <CommentBadge fieldKey="termBullets" />
              </label>
              <textarea
                value={termBulletsText}
                onChange={(e) => setTermBulletsText(e.target.value)}
                rows={4}
                className="dashboard-input min-h-[96px]"
                placeholder={"ZIDA facilitates land allocation within 90 days\nInvestor commits indicative capital within 12 months"}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}>
                Special Conditions <CommentBadge fieldKey="specialConditions" />
              </label>
              <textarea
                value={specialConditions}
                onChange={(e) => setSpecialConditions(e.target.value)}
                rows={2}
                className="dashboard-input"
              />
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={saveDraft} disabled={!hasDraftChanges || busy}>
                Save Draft
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {displayContent.parties && <p><span className="text-white font-medium">Parties: </span>{displayContent.parties} <CommentBadge fieldKey="parties" /></p>}
            {displayContent.projectReference && <p><span className="text-white font-medium">Project: </span>{displayContent.projectReference} <CommentBadge fieldKey="projectReference" /></p>}
            {displayContent.purpose && <p><span className="text-white font-medium">Purpose: </span>{displayContent.purpose} <CommentBadge fieldKey="purpose" /></p>}
            {displayContent.scope && <p><span className="text-white font-medium">Scope: </span>{displayContent.scope} <CommentBadge fieldKey="scope" /></p>}
            {displayContent.indicativeCapital && <p><span className="text-white font-medium">Indicative Capital: </span>{displayContent.indicativeCapital} <CommentBadge fieldKey="indicativeCapital" /></p>}
            {displayContent.effectiveDate && <p><span className="text-white font-medium">Effective Date: </span>{displayContent.effectiveDate} <CommentBadge fieldKey="effectiveDate" /></p>}
            {(displayContent.termBullets ?? []).length > 0 && (
              <div>
                <ul className="list-disc pl-5 space-y-0.5">
                  {displayContent.termBullets!.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
                <CommentBadge fieldKey="termBullets" />
              </div>
            )}
            {displayContent.specialConditions && <p className="italic">{displayContent.specialConditions} <CommentBadge fieldKey="specialConditions" /></p>}
            {displayContent.nonBindingStatement && <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{displayContent.nonBindingStatement}</p>}
            {displayContent.governingLaw && <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{displayContent.governingLaw}</p>}
            {!displayContent.parties && !displayContent.projectReference && (displayContent.termBullets ?? []).length === 0 && (
              <p className="italic" style={{ color: "var(--color-text-muted)" }}>
                {isDrafting ? "ZIDA is preparing the draft terms." : "No terms recorded."}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Formatting — stays editable through ready_for_signature */}
      {(isFinalized || isReadyForSignature || isExecuted) && (
        <div className="space-y-3 rounded-lg p-3" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid var(--color-sovereign-border)" }}>
          <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
            Formatting {mou.formattingLocked && "(Locked)"}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Show letterhead</span>
            <Switch
              checked={Boolean(mou.formatting.letterhead)}
              onCheckedChange={(v) => updateFormatting({ letterhead: v })}
              disabled={!canEdit || mou.formattingLocked || busy}
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-text-muted)" }}>Page Break Preference</label>
            <Select
              value={mou.formatting.pageBreakPreference ?? "single_page"}
              onValueChange={(v) => updateFormatting({ pageBreakPreference: v as MouFormatting["pageBreakPreference"] })}
              disabled={!canEdit || mou.formattingLocked}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="single_page">Single page</SelectItem>
                <SelectItem value="per_section">Break per section</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-text-muted)" }}>Footer Text</label>
            <input
              defaultValue={mou.formatting.footerText ?? ""}
              onBlur={(e) => updateFormatting({ footerText: e.target.value })}
              disabled={!canEdit || mou.formattingLocked}
              className="dashboard-input"
              placeholder="Confidential — Zimbabwe Investment Development Agency"
            />
          </div>
        </div>
      )}

      {/* Signature / execution */}
      {(isReadyForSignature || isExecuted) && (
        <div className="space-y-2 rounded-lg p-3" style={{ backgroundColor: "rgba(255,211,0,0.06)", border: "1px solid rgba(255,211,0,0.25)" }}>
          <p className="text-[11px] uppercase tracking-wide" style={{ color: "#fde047" }}>Signature</p>
          {isExecuted && mou.signatureMetadata ? (
            <div className="grid grid-cols-2 gap-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              <div>
                <p className="text-white font-medium">{mou.signatureMetadata.investorSignedBy}</p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{mou.signatureMetadata.investorSignedRole} — {mou.signatureMetadata.investorSignedDate}</p>
              </div>
              <div>
                <p className="text-white font-medium">{mou.signatureMetadata.zidaSignedBy}</p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{mou.signatureMetadata.zidaSignedRole} — {mou.signatureMetadata.zidaSignedDate}</p>
              </div>
              {mou.signatureMetadata.methodOrLocation && (
                <p className="col-span-2 text-xs italic" style={{ color: "var(--color-text-muted)" }}>
                  {mou.signatureMetadata.methodOrLocation}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Awaiting signature off-platform, in due time and location agreed by both parties. Record it here once
              signed.
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      {canActAtAll && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {isDrafting && canEdit && (
            <Button size="sm" onClick={() => act("submit_for_review")} disabled={busy}>
              Submit for Review
            </Button>
          )}

          {isInReview && (
            <>
              {((isInvestor && !mou.investorApprovedAt) || (isZida && !mou.zidaApprovedAt)) && (
                <Button size="sm" onClick={() => act("approve")} disabled={busy}>
                  Approve Draft
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => setChangesOpen(true)} disabled={busy}>
                Request Changes
              </Button>
            </>
          )}

          {isBothApproved && canEdit && (
            <>
              <Button size="sm" onClick={() => act("finalize")} disabled={busy}>
                Finalize
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setChangesOpen(true)} disabled={busy}>
                Request Changes
              </Button>
            </>
          )}

          {isFinalized && canEdit && (
            <>
              <Button size="sm" onClick={() => act("mark_ready_for_signature")} disabled={busy}>
                Mark Ready for Signature
              </Button>
              <Button size="sm" variant="secondary" onClick={() => act("reopen")} disabled={busy}>
                <RotateCcw className="h-3.5 w-3.5" /> Reopen for Edits
              </Button>
            </>
          )}

          {isReadyForSignature && canEdit && (
            <>
              <Button size="sm" onClick={() => setExecuteOpen(true)} disabled={busy}>
                Record Execution
              </Button>
              <Button size="sm" variant="secondary" onClick={() => act("reopen")} disabled={busy}>
                <RotateCcw className="h-3.5 w-3.5" /> Reopen for Edits
              </Button>
            </>
          )}

          {(isFinalized || isReadyForSignature || isExecuted) && (
            <>
              <Button size="sm" variant="secondary" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5" /> Print / Export
              </Button>
              <Button size="sm" variant="secondary" asChild>
                <a href={`/api/engagements/${engagementId}/mou/export`} download title="Download the current terms as a Word document">
                  <FileDown className="h-3.5 w-3.5" /> Download DOCX
                </a>
              </Button>
              <Button size="sm" variant="secondary" onClick={downloadSnapshot} title="Download the frozen MOU record as JSON">
                <Download className="h-3.5 w-3.5" /> Download Snapshot
              </Button>
            </>
          )}
        </div>
      )}

      {/* Request changes dialog */}
      <Dialog open={changesOpen} onOpenChange={setChangesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Changes to the MOU with {investorName}</DialogTitle>
          </DialogHeader>
          <textarea
            value={changesNotes}
            onChange={(e) => setChangesNotes(e.target.value)}
            rows={4}
            placeholder="Describe what needs to change — this is posted to the MOU thread in the Communication Hub."
            className="dashboard-input min-h-[96px]"
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setChangesOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                const ok = await act("request_changes", changesNotes.trim() ? { notes: changesNotes.trim() } : undefined);
                if (ok) {
                  setChangesOpen(false);
                  setChangesNotes("");
                }
              }}
              disabled={busy}
            >
              Send &amp; Request Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record execution dialog */}
      <Dialog open={executeOpen} onOpenChange={setExecuteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record MOU Execution</DialogTitle>
          </DialogHeader>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            No live e-signature capture yet — record who signed, in what capacity, when, and where/how the wet or
            digital signature took place off-platform.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-text-muted)" }}>Investor Signatory</label>
              <input className="dashboard-input" value={signature.investorSignedBy ?? ""} onChange={(e) => setSignature({ ...signature, investorSignedBy: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-text-muted)" }}>Investor Role/Title</label>
              <input className="dashboard-input" value={signature.investorSignedRole ?? ""} onChange={(e) => setSignature({ ...signature, investorSignedRole: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-text-muted)" }}>Investor Signed Date</label>
              <input type="date" className="dashboard-input" value={signature.investorSignedDate ?? ""} onChange={(e) => setSignature({ ...signature, investorSignedDate: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-text-muted)" }}>ZIDA Signatory</label>
              <input className="dashboard-input" value={signature.zidaSignedBy ?? ""} onChange={(e) => setSignature({ ...signature, zidaSignedBy: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-text-muted)" }}>ZIDA Role/Title</label>
              <input className="dashboard-input" value={signature.zidaSignedRole ?? ""} onChange={(e) => setSignature({ ...signature, zidaSignedRole: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-text-muted)" }}>ZIDA Signed Date</label>
              <input type="date" className="dashboard-input" value={signature.zidaSignedDate ?? ""} onChange={(e) => setSignature({ ...signature, zidaSignedDate: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-text-muted)" }}>Method / Location</label>
              <input
                className="dashboard-input"
                placeholder="e.g. Wet signature at ZIDA HQ, Harare"
                value={signature.methodOrLocation ?? ""}
                onChange={(e) => setSignature({ ...signature, methodOrLocation: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setExecuteOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!signature.investorSignedBy || !signature.zidaSignedBy) {
                  toast.error("Both signatories are required");
                  return;
                }
                const ok = await act("record_execution", { signatureMetadata: signature });
                if (ok) setExecuteOpen(false);
              }}
              disabled={busy}
            >
              Record Execution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Per-field review comments (Phase 7) */}
      <Dialog open={commentField !== null} onOpenChange={(o) => { if (!o) { setCommentField(null); setNewComment(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comments — {commentField ? FIELD_LABELS[commentField] ?? commentField : ""}</DialogTitle>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto space-y-3">
            {activeThread.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No comments on this field yet.</p>
            ) : (
              activeThread.map((c) => <CommentRow key={c.id} comment={c} onResolve={resolveComment} />)
            )}
          </div>
          <div className="pt-2 border-t" style={{ borderColor: "var(--color-sovereign-border)" }}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={2}
              placeholder="Leave a note for the other party or ZIDA reviewer…"
              className="dashboard-input min-h-[64px]"
            />
            <div className="flex justify-end mt-2">
              <Button size="sm" onClick={submitComment} disabled={!newComment.trim() || busy}>
                Post Comment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CommentRow({ comment, onResolve }: { comment: MouFieldComment; onResolve: (id: string) => Promise<boolean> }) {
  const resolved = Boolean(comment.resolvedAt);
  return (
    <div className="rounded-md p-2.5" style={{ backgroundColor: resolved ? "rgba(74,222,128,0.06)" : "rgba(255,255,255,0.04)" }}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-white">{comment.authorName}</p>
        <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{fmtDate(comment.createdAt)}</p>
      </div>
      <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>{comment.body}</p>
      {resolved ? (
        <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: "#4ade80" }}>
          <Check className="h-3 w-3" /> Resolved by {comment.resolvedBy}
        </p>
      ) : (
        <button
          type="button"
          onClick={() => onResolve(comment.id)}
          className="text-[10px] mt-1 hover:underline"
          style={{ color: "var(--color-gold)" }}
        >
          Mark resolved
        </button>
      )}
    </div>
  );
}

function ApprovalCard({ label, approvedAt, approvedBy }: { label: string; approvedAt?: string | null; approvedBy?: string | null }) {
  const approved = Boolean(approvedAt);
  return (
    <div
      className="rounded-md px-3 py-2 flex items-center gap-2"
      style={{ backgroundColor: approved ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.03)" }}
    >
      <div
        className="flex h-6 w-6 items-center justify-center rounded-full shrink-0"
        style={{ backgroundColor: approved ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.06)" }}
      >
        {approved ? <Check className="h-3.5 w-3.5" style={{ color: "#4ade80" }} /> : <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--color-text-muted)" }} />}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-white">{label} {approved ? "Approved" : "Pending"}</p>
        {approved && (
          <p className="text-[11px] truncate" style={{ color: "var(--color-text-muted)" }}>
            {approvedBy} · {fmtDate(approvedAt)}
          </p>
        )}
      </div>
    </div>
  );
}
