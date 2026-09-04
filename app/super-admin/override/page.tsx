"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Lock, RotateCcw, ShieldAlert } from "lucide-react";
import type { AuditLogEntry, InvestorEngagement, ProjectStatus, VisibilityLevel } from "@/lib/types";
import { useProjectStore } from "@/context/project-store-context";
import { useAuth } from "@/context/auth-context";
import { STATUS_LABELS } from "@/lib/governance/project-workflow";
import { AccessGate } from "@/components/dashboard/access-gate";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STATUS_OPTIONS: ProjectStatus[] = [
  "draft",
  "submitted_for_review",
  "under_review",
  "changes_requested",
  "approved",
  "published",
  "archived",
];

const VISIBILITY_LABELS: Record<VisibilityLevel, string> = {
  public: "Public (fully searchable)",
  registered: "Registered users",
  qualified_investor: "Qualified investors only",
  admin_only: "Admin only",
};

const REASON_CODES = [
  "Regulatory Compliance Clearance",
  "Executive/Ministerial Directive",
  "Emergency Retraction",
  "Administrative QA Correction",
] as const;

export default function SuperAdminOverridePage() {
  const { projects, refresh, isLoading } = useProjectStore();
  const { isSuperAdmin, isLoading: authLoading } = useAuth();

  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("published");
  const [visibility, setVisibility] = useState<VisibilityLevel>("public");
  const [reasonCode, setReasonCode] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [justificationNote, setJustificationNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [engagements, setEngagements] = useState<InvestorEngagement[]>([]);
  const [history, setHistory] = useState<AuditLogEntry[]>([]);

  const selectedProject = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/overrides");
      if (res.ok) setHistory((await res.json()) as AuditLogEntry[]);
    } catch {
      /* non-blocking */
    }
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    void loadHistory();
    (async () => {
      try {
        const res = await fetch("/api/engagements");
        if (res.ok) setEngagements((await res.json()) as InvestorEngagement[]);
      } catch {
        /* non-blocking */
      }
    })();
  }, [isSuperAdmin, loadHistory]);

  const engagementCount = useMemo(
    () => (selectedProject ? engagements.filter((e) => e.projectId === selectedProject.id).length : 0),
    [engagements, selectedProject]
  );

  const formValid = Boolean(projectId && reasonCode && referenceId.trim() && justificationNote.trim());
  const willChange =
    selectedProject &&
    (selectedProject.projectStatus !== status || selectedProject.visibilityLevel !== visibility);

  const resetForm = () => {
    setReasonCode("");
    setReferenceId("");
    setJustificationNote("");
    setConfirmTitle("");
  };

  const handleApply = async () => {
    if (!selectedProject) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, visibility, reasonCode, referenceId, justificationNote, confirmTitle }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Override failed");
      }
      toast.success("Override applied and written to the audit log");
      setConfirmOpen(false);
      resetForm();
      await Promise.all([refresh(), loadHistory()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply override");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevert = async (auditLogId: string) => {
    try {
      const res = await fetch("/api/overrides/revert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditLogId }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Revert failed");
      }
      toast.success("Override reverted to its pre-override state");
      await Promise.all([refresh(), loadHistory()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revert override");
    }
  };

  if (!authLoading && !isSuperAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Sign in with a super admin account to override project status and visibility."
      />
    );
  }

  const titleMatches = confirmTitle.trim().toLowerCase() === (selectedProject?.title ?? "").trim().toLowerCase();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded" style={{ color: "#fbbf24", backgroundColor: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}>
              Sovereign Control Circuit
            </span>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded" style={{ color: "#f87171", backgroundColor: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}>
              Audit Immutable
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-1">Publishing &amp; Workflow Override</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Force project status and visibility, bypassing the normal institutional review queue when legally
            authorized. Every override requires justification and is written to the audit log.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          {/* 1. Target */}
          <section className="dashboard-panel p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
              1. Select target &amp; override parameters
            </h2>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-text-muted)" }}>Target project</label>
              <Select value={projectId} onValueChange={setProjectId} disabled={isLoading || authLoading}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title.slice(0, 70)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-text-muted)" }}>Force status</label>
                <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-text-muted)" }}>Visibility level</label>
                <Select value={visibility} onValueChange={(v) => setVisibility(v as VisibilityLevel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(VISIBILITY_LABELS) as VisibilityLevel[]).map((v) => (
                      <SelectItem key={v} value={v}>{VISIBILITY_LABELS[v]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* 2. Justification */}
          <section className="dashboard-panel p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
              2. Mandatory audit &amp; compliance justification
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-text-muted)" }}>Override reason code *</label>
                <Select value={reasonCode} onValueChange={setReasonCode}>
                  <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                  <SelectContent>
                    {REASON_CODES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-text-muted)" }}>Directive / ticket ref *</label>
                <input
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  placeholder="e.g. ZIDA-DIR-2026-089"
                  className="dashboard-input h-9 w-full"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-text-muted)" }}>Justification note *</label>
              <textarea
                value={justificationNote}
                onChange={(e) => setJustificationNote(e.target.value)}
                rows={2}
                placeholder="Specify the exact justification for bypassing institutional workflow..."
                className="dashboard-input w-full"
              />
            </div>
          </section>
        </div>

        {/* Pre-flight impact + CTA */}
        <div className="space-y-5">
          <section className="dashboard-panel p-5 space-y-4" style={{ borderColor: "rgba(251,191,36,0.2)" }}>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: "#fbbf24" }}>
              <AlertTriangle className="h-4 w-4" /> Pre-flight impact assessment
            </div>
            {selectedProject ? (
              <div className="space-y-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid var(--color-sovereign-border)" }}>
                  <p className="text-[10px] font-mono uppercase" style={{ color: "var(--color-text-muted)" }}>State transition</p>
                  <p className="text-white font-medium mt-0.5">
                    {STATUS_LABELS[selectedProject.projectStatus]} ({VISIBILITY_LABELS[selectedProject.visibilityLevel]})
                  </p>
                  <p className="text-white font-medium">
                    <span style={{ color: "#fbbf24" }}>→</span> {STATUS_LABELS[status]} ({VISIBILITY_LABELS[visibility]})
                  </p>
                  {!willChange && <p className="mt-1" style={{ color: "var(--color-text-muted)" }}>No change from current state.</p>}
                </div>
                <ul className="space-y-2">
                  <li>
                    {selectedProject.documents?.length ?? 0} attached document{(selectedProject.documents?.length ?? 0) === 1 ? "" : "s"} follow the new visibility level.
                  </li>
                  <li>
                    {engagementCount} existing engagement{engagementCount === 1 ? "" : "s"} are linked to this project.
                  </li>
                  <li style={{ color: "var(--color-text-muted)" }}>
                    No automated investor email dispatch runs on override (delivery is deferred platform-wide).
                  </li>
                </ul>
              </div>
            ) : (
              <p className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>
                Select a target project to generate the impact assessment.
              </p>
            )}
            <Button
              className="w-full"
              disabled={!formValid || !willChange}
              onClick={() => { setConfirmTitle(""); setConfirmOpen(true); }}
            >
              Apply Override
            </Button>
            {selectedProject && !willChange && (
              <p className="text-[11px] text-center" style={{ color: "var(--color-text-muted)" }}>
                Change the status or visibility to enable the override.
              </p>
            )}
          </section>
        </div>
      </div>

      {/* Recent overrides */}
      <section className="dashboard-panel p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Recent manual overrides</h2>
        <div className="overflow-x-auto">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Action</th>
                <th>Forced state</th>
                <th>Reason</th>
                <th>Applied by</th>
                <th>When</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-sm py-4" style={{ color: "var(--color-text-muted)" }}>
                    No overrides recorded yet.
                  </td>
                </tr>
              ) : (
                history.map((h) => {
                  const meta = h.metadata ?? {};
                  const to = meta.to as { status?: ProjectStatus; visibility?: VisibilityLevel } | undefined;
                  const applied = h.action === "project.override_applied";
                  return (
                    <tr key={h.id}>
                      <td className="text-white">{(meta.projectTitle as string) ?? (meta.title as string) ?? "—"}</td>
                      <td className="capitalize">{applied ? "Applied" : "Reverted"}</td>
                      <td>
                        {to?.status ? `${STATUS_LABELS[to.status]} · ${to.visibility ? VISIBILITY_LABELS[to.visibility] : ""}` : "—"}
                      </td>
                      <td>{(meta.reasonCode as string) ?? "—"}</td>
                      <td>{h.actorName ?? "—"}</td>
                      <td className="whitespace-nowrap">{new Date(h.createdAt).toLocaleString()}</td>
                      <td>
                        {applied && (
                          <Button size="sm" variant="ghost" onClick={() => handleRevert(h.id)}>
                            <RotateCcw className="h-3.5 w-3.5" /> Revert
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Confirmation modal */}
      <Dialog open={confirmOpen} onOpenChange={(o) => !o && setConfirmOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" style={{ color: "#fbbf24" }} /> Confirm sovereign override
            </DialogTitle>
            <DialogDescription>
              You are about to force <span className="text-white font-medium">{selectedProject?.title}</span> to{" "}
              <span className="text-white font-medium">{STATUS_LABELS[status]}</span> /{" "}
              <span className="text-white font-medium">{VISIBILITY_LABELS[visibility]}</span>. This bypasses the normal
              approval queue and writes an immutable audit record.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md p-2.5 text-xs font-mono space-y-1" style={{ backgroundColor: "rgba(255,255,255,0.03)", color: "var(--color-text-muted)" }}>
            <div>Ref: {referenceId || "—"}</div>
            <div>Reason: {reasonCode || "—"}</div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              Type the project title to confirm
            </label>
            <input
              value={confirmTitle}
              onChange={(e) => setConfirmTitle(e.target.value)}
              placeholder={selectedProject?.title}
              className="dashboard-input h-9 w-full"
              autoFocus
            />
          </div>

          {/* Scaffolded dual-control — deliberately disabled until a second-approver workflow exists. */}
          <div className="flex items-center gap-2 rounded-md px-2.5 py-2 text-xs opacity-60" style={{ border: "1px dashed var(--color-sovereign-border)", color: "var(--color-text-muted)" }}>
            <Lock className="h-3.5 w-3.5 shrink-0" />
            Dual-control second sign-off — available in a future release.
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleApply} disabled={submitting || !titleMatches}>
              {submitting ? "Applying…" : "Confirm & write audit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
