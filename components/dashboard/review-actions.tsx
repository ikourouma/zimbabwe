"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { InvestmentProject, ProjectStatus } from "@/lib/types";
import type { WorkflowRole } from "@/lib/governance/project-workflow";
import { getAvailableActions, isInReviewStatus, STATUS_LABELS } from "@/lib/governance/project-workflow";
import { Button } from "@/components/ui/button";

const ACTION_LABELS: Partial<Record<ProjectStatus, string>> = {
  draft: "Send back to draft",
  submitted_for_review: "Resubmit for review",
  under_review: "Start review",
  changes_requested: "Request changes",
  approved: "Approve",
  published: "Publish",
  archived: "Archive",
};

const ACTION_VARIANT: Partial<Record<ProjectStatus, "default" | "secondary" | "destructive" | "gold" | "outline">> = {
  approved: "default",
  published: "gold",
  archived: "destructive",
  changes_requested: "secondary",
};

// Requesting changes without notes leaves the submitter with no actionable feedback — same
// requirement the previous hardcoded ReviewActions enforced, carried over here.
const REQUIRES_NOTES: ProjectStatus[] = ["changes_requested"];

interface ReviewActionsProps {
  project: InvestmentProject;
  role: WorkflowRole | null;
  onAction: (status: ProjectStatus, notes?: string) => void | Promise<void>;
}

/** Workflow-driven review actions — every available button comes straight from
 *  `getAvailableActions(project, role)` (lib/governance/project-workflow.ts) instead of a
 *  hardcoded per-status button list, closing the admin/approver action-mismatch the dashboard
 *  audit found (buttons that didn't match the server's canTransition() rules for that role). */
export function ReviewActions({ project, role, onAction }: ReviewActionsProps) {
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState<ProjectStatus | null>(null);

  if (!role) return null;

  const actions = getAvailableActions(project, role);
  if (actions.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        No further actions available for this status with your role.
      </p>
    );
  }

  // Rejecting a project mid-review is a governance decision, not routine archival: it must carry a
  // reason (persisted as reviewerNotes and captured by the audit log's project.status_changed event).
  // We surface it as a distinct danger-styled "Reject" only while the project is actively in review;
  // for already-approved/published projects the same `archived` transition reads as "Archive".
  const isRejectContext = isInReviewStatus(project.projectStatus);
  const notesRequiredFor = (status: ProjectStatus) =>
    REQUIRES_NOTES.includes(status) || (status === "archived" && isRejectContext);
  const anyNotesRequired = actions.some((s) => notesRequiredFor(s));

  const labelFor = (status: ProjectStatus) => {
    if (status === "archived" && isRejectContext) return "Reject";
    return ACTION_LABELS[status] ?? STATUS_LABELS[status];
  };

  const handleClick = async (status: ProjectStatus) => {
    if (notesRequiredFor(status) && !notes.trim()) {
      toast.error(
        status === "archived" && isRejectContext
          ? "A rejection reason is required — it's shared with the submitter and logged in the audit trail."
          : "Reviewer notes are required for this action."
      );
      return;
    }
    setPending(status);
    try {
      await onAction(status, notes.trim() || undefined);
      setNotes("");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-text-muted)" }}>
          Reviewer notes {anyNotesRequired && "(required to request changes or reject)"}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="dashboard-input"
          placeholder="Add context for the submitter…"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map((status) => (
          <Button
            key={status}
            size="sm"
            variant={status === "archived" && isRejectContext ? "destructive" : ACTION_VARIANT[status] ?? "outline"}
            disabled={pending !== null}
            onClick={() => handleClick(status)}
          >
            {pending === status ? "Working…" : labelFor(status)}
          </Button>
        ))}
      </div>
    </div>
  );
}
