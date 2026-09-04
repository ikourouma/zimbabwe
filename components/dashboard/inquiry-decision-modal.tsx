"use client";

import { useEffect, useState } from "react";
import { Check, MessageSquareWarning, ShieldAlert, X } from "lucide-react";
import type { LeadInquiry } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type InquiryDecisionAction = "approved" | "declined" | "changes_requested";

const ACTION_COPY: Record<
  InquiryDecisionAction,
  { title: string; verb: string; icon: typeof Check; placeholder: string; noteLabel: string }
> = {
  approved: {
    title: "Approve inquiry",
    verb: "Approve",
    icon: Check,
    placeholder: "e.g. Institutional details verified against submitted documentation; authorized by Head of Investment.",
    noteLabel: "Justification (required — recorded in the audit log)",
  },
  declined: {
    title: "Decline inquiry",
    verb: "Decline",
    icon: X,
    placeholder: "e.g. Does not meet the platform's investor criteria at this time.",
    noteLabel: "Reason (required — shown to the applicant and recorded in the audit log)",
  },
  changes_requested: {
    title: "Request more information",
    verb: "Send request",
    icon: MessageSquareWarning,
    placeholder: "e.g. Please provide your company's business registration ID and corporate website to complete KYC.",
    noteLabel: "Message to applicant (required — shown to them and recorded in the audit log)",
  },
};

interface InquiryDecisionModalProps {
  inquiry: LeadInquiry | null;
  action: InquiryDecisionAction | null;
  /** Only meaningful for `approved` + `engagementType === "investor"` — when false, blocks
   *  confirming and nudges the reviewer toward "Request More Info" instead (Investor
   *  Qualification Vetting plan's KYC-before-qualified rule). */
  kycComplete: boolean;
  onConfirm: (reason: string) => Promise<void>;
  onCancel: () => void;
}

/**
 * Shared reason-required decision gate for the Inquiries vetting workflow — same "Four-Eyes"
 * mandatory-justification pattern as RoleChangeModal/AccountStatusModal, extended with a third
 * action (Request More Info) and a hard KYC-completeness block on investor approvals.
 */
export function InquiryDecisionModal({ inquiry, action, kycComplete, onConfirm, onCancel }: InquiryDecisionModalProps) {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const open = Boolean(inquiry && action);

  useEffect(() => {
    if (open) {
      setReason("");
      setPending(false);
    }
  }, [open, inquiry?.id, action]);

  if (!inquiry || !action) return null;

  const copy = ACTION_COPY[action];
  const Icon = copy.icon;
  const isInvestorApproval = action === "approved" && inquiry.engagementType === "investor";
  // A heads-up only, not a hard client-side block — the server checks both the inquiry AND the
  // matched profile's own KYC fields (a returning applicant may already have KYC on file from a
  // prior cycle), so it remains the sole source of truth and will reject with KYC_INCOMPLETE if
  // this reviewer proceeds anyway on genuinely incomplete data.
  const showKycWarning = isInvestorApproval && !kycComplete;

  const handleConfirm = async () => {
    if (!reason.trim()) return;
    setPending(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-4 w-4" style={{ color: action === "declined" ? "#f87171" : "var(--color-gold)" }} />
            {copy.title}
          </DialogTitle>
          <DialogDescription>
            {inquiry.name} ({inquiry.email})
            {isInvestorApproval && " — approving will upgrade this account to Qualified Investor once matched."}
          </DialogDescription>
        </DialogHeader>

        {showKycWarning && (
          <div
            className="rounded-md p-2.5 text-xs flex items-start gap-2"
            style={{ backgroundColor: "rgba(248,113,113,0.1)", color: "#f87171" }}
          >
            <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            This applicant&apos;s KYC information looks incomplete. The role can only become Qualified Investor
            once organization, phone, HQ address, business registration ID, and website are all on file —
            approving now may be rejected, so consider &ldquo;Request More Info&rdquo; instead.
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
            {copy.noteLabel}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="dashboard-input"
            placeholder={copy.placeholder}
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant={action === "declined" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={pending || !reason.trim()}
          >
            <Icon className="h-3.5 w-3.5" /> {pending ? `${copy.verb}ing…` : copy.verb}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
