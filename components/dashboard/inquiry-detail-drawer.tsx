"use client";

import Link from "next/link";
import { Check, FolderSearch, MessageSquareWarning, ShieldAlert, ShieldCheck, X } from "lucide-react";
import type { LeadInquiry } from "@/lib/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { INQUIRY_STATUS_LABELS } from "@/lib/governance/inquiry-filters";
import { getRoutingDesk } from "@/lib/data/routing-desks";
import { describeInterest, ENGAGEMENT_TYPE_LABELS, formatInquiryType, isInquiryKycComplete } from "@/lib/utils/inquiry-display";
import type { InquiryDecisionAction } from "@/components/dashboard/inquiry-decision-modal";

const ROUTED_TYPES: LeadInquiry["type"][] = [
  "strategic_partnership",
  "document_request",
  "meeting_request",
  "investment_interest",
  "valuation_teaser",
];

interface InquiryDetailDrawerProps {
  inquiry: LeadInquiry | null;
  onClose: () => void;
  /** `/admin/users?userId=…` vs `/super-admin/users?userId=…` — the one real console difference. */
  usersHref: (userId: string) => string;
  onDecide?: (inquiry: LeadInquiry, action: InquiryDecisionAction) => void;
  onResetToPending?: (id: string) => void;
}

/**
 * Shared inquiry detail drawer (Platform Feedback Batch v4, Phase 7) — extracted from the old
 * fixed master-detail layout so it can be reused as the click-through target for all four
 * Kanban/List/Table/Matrix views on both /admin/inquiries and /super-admin/inquiries, exactly like
 * ProjectDetailDrawer/EngagementDetailDrawer/MouRegistryView's drawer already work for their own
 * registries. Deliberately shows the fuller field set (Engagement Type + Routed Desk) on both
 * consoles now, rather than the two pages silently diverging on what's visible.
 */
export function InquiryDetailDrawer({ inquiry, onClose, usersHref, onDecide, onResetToPending }: InquiryDetailDrawerProps) {
  return (
    <Sheet open={Boolean(inquiry)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {inquiry && (
          <>
            <SheetHeader>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
                <div className="flex flex-col items-start gap-1.5">
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-semibold"
                    style={{
                      backgroundColor:
                        inquiry.status === "approved"
                          ? "rgba(0,100,0,0.2)"
                          : inquiry.status === "declined"
                            ? "rgba(255,255,255,0.08)"
                            : inquiry.status === "changes_requested"
                              ? "rgba(251,191,36,0.15)"
                              : "rgba(255,211,0,0.15)",
                      color:
                        inquiry.status === "approved"
                          ? "#86efac"
                          : inquiry.status === "declined"
                            ? "#d1d5db"
                            : inquiry.status === "changes_requested"
                              ? "#fbbf24"
                              : "#fde047",
                    }}
                  >
                    {INQUIRY_STATUS_LABELS[inquiry.status ?? "pending"].toUpperCase()}
                  </span>
                  {inquiry.engagementType === "investor" && (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: isInquiryKycComplete(inquiry) ? "rgba(0,100,0,0.15)" : "rgba(248,113,113,0.1)",
                        color: isInquiryKycComplete(inquiry) ? "#86efac" : "#f87171",
                      }}
                    >
                      {isInquiryKycComplete(inquiry) ? (
                        <ShieldCheck className="h-3 w-3" />
                      ) : (
                        <ShieldAlert className="h-3 w-3" />
                      )}
                      KYC {isInquiryKycComplete(inquiry) ? "Complete" : "Incomplete"}
                    </span>
                  )}
                </div>
                {inquiry.matchedUserId && (
                  <Link
                    href={usersHref(inquiry.matchedUserId)}
                    className="inline-flex items-center gap-1.5 text-xs underline"
                    style={{ color: "var(--color-gold)" }}
                  >
                    <FolderSearch className="h-3 w-3" /> Open Institutional Compliance Dossier
                  </Link>
                )}
              </div>
              <SheetTitle>{inquiry.name}</SheetTitle>
              <SheetDescription>
                {inquiry.email}
                {inquiry.phone ? ` · ${inquiry.phone}` : ""}
                {inquiry.organization ? ` · ${inquiry.organization}` : ""}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                  Type
                </p>
                <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                  {formatInquiryType(inquiry.type)}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                  Submitted
                </p>
                <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                  {new Date(inquiry.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                  Engagement Type
                </p>
                <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                  {inquiry.engagementType ? ENGAGEMENT_TYPE_LABELS[inquiry.engagementType] ?? inquiry.engagementType : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                  Sector / Ticket / Ministry
                </p>
                <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                  {describeInterest(inquiry)}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                  Routed Desk
                </p>
                <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                  {ROUTED_TYPES.includes(inquiry.type)
                    ? getRoutingDesk(inquiry.engagementType, Boolean(inquiry.projectId))
                    : "—"}
                </p>
              </div>
              {inquiry.engagementType === "investor" && (
                <>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                      HQ Address
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                      {inquiry.hqAddress || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                      Business Registration ID
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                      {inquiry.businessRegistrationId || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                      Corporate Website
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                      {inquiry.websiteUrl || "—"}
                    </p>
                  </div>
                </>
              )}
            </div>

            {inquiry.reviewNotes && (
              <div
                className="mt-4 rounded-md p-3 text-xs"
                style={{ backgroundColor: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)" }}
              >
                <p className="uppercase tracking-wide font-semibold mb-1" style={{ color: "#fbbf24" }}>
                  Staff Note {inquiry.reviewedBy ? `— ${inquiry.reviewedBy}` : ""}
                </p>
                <p style={{ color: "var(--color-text-secondary)" }}>{inquiry.reviewNotes}</p>
              </div>
            )}

            {inquiry.message && (
              <div className="mt-4">
                <p className="text-[11px] uppercase tracking-wide mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Message
                </p>
                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {inquiry.message}
                </p>
              </div>
            )}

            {inquiry.engagementType === "investor" && (
              <div className="mt-4 rounded-md p-3 text-xs" style={{ backgroundColor: "rgba(0,100,0,0.12)", color: "#86efac" }}>
                Approving this inquiry will automatically upgrade the applicant&apos;s account role to Qualified
                Investor if they already have an account with this email — KYC must be complete first.
              </div>
            )}

            {onDecide && onResetToPending && (
            <div className="mt-4 flex flex-wrap gap-2">
              {["pending", "changes_requested"].includes(inquiry.status ?? "pending") ? (
                <>
                  <Button size="sm" onClick={() => onDecide(inquiry, "approved")}>
                    <Check className="h-3.5 w-3.5" />
                    {inquiry.engagementType === "investor" ? "Approve as Qualified Investor" : "Approve"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onDecide(inquiry, "changes_requested")}>
                    <MessageSquareWarning className="h-3.5 w-3.5" /> Request More Info
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => onDecide(inquiry, "declined")}>
                    <X className="h-3.5 w-3.5" /> Decline
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => onResetToPending(inquiry.id)}>
                  Reset to pending
                </Button>
              )}
            </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
