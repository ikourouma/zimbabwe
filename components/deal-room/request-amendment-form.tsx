"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Send, Trash2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import type { InvestmentProject, ProjectMessage } from "@/lib/types";
import {
  AMENDABLE_FIELD_LABELS as FIELD_LABELS,
  NUMERIC_AMENDABLE_FIELDS as NUMERIC_FIELDS,
  isAmendmentRequestPending,
  type AmendableField,
} from "@/lib/governance/amendable-fields";

interface RequestAmendmentFormProps {
  project: InvestmentProject;
  onFiled?: () => void;
}

/**
 * "Request Amendment" — the post-approval change path for a locked approved/published project.
 * Two filers share this form (POST /api/projects/[id]/amendment-request never mutates the live
 * row; staff Approve is what applies the diff):
 *   - `qualified` investor-owner (Investor Dashboard Expansion plan, Phase 5): single-stage,
 *     ZIDA Admin decides.
 *   - `government` reviewer on their own ministry's project (Platform Feedback Batch v4,
 *     Phase 8): two-stage — their Ministry Admin decides first, then ZIDA Admin.
 */
export function RequestAmendmentForm({ project, onFiled }: RequestAmendmentFormProps) {
  const { isGovernment, userId } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [rows, setRows] = useState<{ field: AmendableField; value: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<ProjectMessage | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/projects/${project.id}/amendment-request`)
      .then((res) => (res.ok ? res.json() : []))
      .then((cards: ProjectMessage[]) => {
        if (!mounted) return;
        setPending(
          cards.find(
            (c) =>
              isAmendmentRequestPending(c.payload?.status) &&
              (!userId || c.authorUserId === userId)
          ) ?? null
        );
      })
      .catch(() => {})
      .finally(() => mounted && setChecking(false));
    return () => {
      mounted = false;
    };
  }, [project.id, userId]);

  const availableFields = (Object.keys(FIELD_LABELS) as AmendableField[]).filter(
    (f) => !rows.some((r) => r.field === f)
  );

  const addRow = () => {
    const next = availableFields[0];
    if (next) setRows((r) => [...r, { field: next, value: "" }]);
  };
  const removeRow = (index: number) => setRows((r) => r.filter((_, i) => i !== index));
  const updateRow = (index: number, patch: Partial<{ field: AmendableField; value: string }>) =>
    setRows((r) => r.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please explain why this change is needed.");
      return;
    }
    const filledRows = rows.filter((r) => r.value.trim());
    if (filledRows.length === 0) {
      toast.error("Add at least one field to change.");
      return;
    }
    const proposedChanges: Record<string, unknown> = {};
    for (const r of filledRows) {
      proposedChanges[r.field] = NUMERIC_FIELDS.has(r.field) ? Number(r.value) : r.value.trim();
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/amendment-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim(), proposedChanges }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Could not file the amendment request.");
        return;
      }
      const card = (await res.json()) as ProjectMessage;
      setPending(card);
      setOpen(false);
      setReason("");
      setRows([]);
      toast.success(
        isGovernment
          ? "Amendment request submitted to your Ministry Admin for first review."
          : "Amendment request submitted to ZIDA for review."
      );
      onFiled?.();
    } catch {
      toast.error("A network error occurred — please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (checking) return null;

  if (pending) {
    const stageLabel =
      pending.payload?.status === "escalated"
        ? "Escalated to ZIDA Admin for final action"
        : pending.authorRole === "government"
          ? "Awaiting your ministry's Ministry Admin"
          : "Pending ZIDA review";
    return (
      <div className="rounded-lg p-4" style={{ backgroundColor: "rgba(255,211,0,0.06)", border: "1px solid rgba(255,211,0,0.2)" }}>
        <p className="text-sm text-white font-medium mb-1">Amendment request pending review — {stageLabel}</p>
        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{pending.body}</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-sovereign-ghost text-xs px-4 py-2">
        Request Amendment
      </button>
    );
  }

  return (
    <div className="dashboard-panel p-5 space-y-4">
      <div>
        <p className="text-sm font-medium text-white mb-1">Request an Amendment</p>
        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          {isGovernment
            ? "This project is locked. Describe the change(s) you need — your Ministry Admin reviews first, then ZIDA Admin makes the final call."
            : "This proposal is locked. Describe the change(s) you need — ZIDA will review and apply them if approved."}
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text-muted)" }}>
          Reason for this change *
        </label>
        <textarea
          className="dashboard-input min-h-[72px]"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Updated feasibility study revised the capital requirement"
        />
      </div>

      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-start gap-2">
            <select
              className="dashboard-input w-48 shrink-0"
              value={row.field}
              onChange={(e) => updateRow(i, { field: e.target.value as AmendableField })}
            >
              <option value={row.field}>{FIELD_LABELS[row.field]}</option>
              {availableFields.map((f) => (
                <option key={f} value={f}>{FIELD_LABELS[f]}</option>
              ))}
            </select>
            <input
              className="dashboard-input flex-1"
              type={NUMERIC_FIELDS.has(row.field) ? "number" : "text"}
              value={row.value}
              onChange={(e) => updateRow(i, { value: e.target.value })}
              placeholder={`Proposed ${FIELD_LABELS[row.field]}`}
            />
            <button type="button" onClick={() => removeRow(i)} className="p-2 text-red-400 hover:text-red-300 shrink-0">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {availableFields.length > 0 && (
          <button type="button" onClick={addRow} className="inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--color-gold)" }}>
            <Plus className="h-3.5 w-3.5" /> Add a field to change
          </button>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="button" onClick={() => setOpen(false)} disabled={busy} className="btn-sovereign-ghost text-xs px-4 py-2">
          Cancel
        </button>
        <button type="button" onClick={handleSubmit} disabled={busy} className="btn-sovereign text-xs px-4 py-2 disabled:opacity-40">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Submit Request
        </button>
      </div>
    </div>
  );
}
