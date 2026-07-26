"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bookmark, Bell, Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useLeadCapture } from "@/context/lead-capture-context";
import type { ProjectFilters } from "@/lib/types";
import { summarizeFiltersForLead } from "@/lib/utils/saved-search";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[var(--color-gold)] focus:outline-none";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
      {children}
    </label>
  );
}

interface SaveSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ProjectFilters;
  /** Persists a search for a signed-in user (returns the created row; return value is unused here). */
  onSaved?: (name: string, filters: ProjectFilters, alertEnabled: boolean) => Promise<unknown>;
}

export function SaveSearchModal({ open, onOpenChange, filters, onSaved }: SaveSearchModalProps) {
  const { userId, name: authName, email: authEmail, organization: authOrg } = useAuth();
  const { addInquiry } = useLeadCapture();
  const isSignedIn = Boolean(userId);

  const summary = summarizeFiltersForLead(filters);

  const [name, setName] = useState("");
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [leadName, setLeadName] = useState(authName ?? "");
  const [leadEmail, setLeadEmail] = useState(authEmail ?? "");
  const [leadOrg, setLeadOrg] = useState(authOrg ?? "");
  const [submitting, setSubmitting] = useState(false);

  const defaultName = summary.text === "All opportunities" ? "All opportunities" : summary.text;

  const canSubmit = isSignedIn
    ? !submitting
    : leadName.trim().length > 0 && /.+@.+\..+/.test(leadEmail) && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (isSignedIn) {
        await onSaved?.(name.trim() || defaultName, filters, alertEnabled);
        toast.success("Search saved", {
          description: alertEnabled
            ? "Email alerts will activate once alert delivery is enabled."
            : "Re-apply it anytime from Saved searches.",
        });
      } else {
        // Anonymous fallback: file a lead-capture inquiry for the deal team instead of persisting.
        await addInquiry({
          type: "investment_interest",
          name: leadName.trim(),
          email: leadEmail.trim(),
          organization: leadOrg.trim() || undefined,
          sectorIds: summary.sectorIds,
          message: `Registry interest${alertEnabled ? " (email alerts requested — delivery pending)" : ""}: ${summary.text}`,
          status: "pending",
        });
        toast.success("Interest registered", {
          description: "Our deal team will follow up. Sign in to save searches for one-click access.",
        });
      }
      onOpenChange(false);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-[var(--color-gold)]" />
            {isSignedIn ? "Save This Search" : "Register Interest & Get Alerts"}
          </DialogTitle>
          <DialogDescription>
            {isSignedIn
              ? "Save this filter set for one-click access and (soon) email alerts when matching opportunities are added or updated."
              : "Tell us what you're looking for and we'll follow up. Sign in to save searches to your account."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
            <span className="font-medium text-white">Filters:</span> {summary.text}
          </div>

          {isSignedIn ? (
            <div>
              <FieldLabel>Search name</FieldLabel>
              <input
                className={fieldClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={defaultName}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Full name</FieldLabel>
                  <input className={fieldClass} value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Jane Investor" />
                </div>
                <div>
                  <FieldLabel>Work email</FieldLabel>
                  <input type="email" className={fieldClass} value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} placeholder="jane@fund.com" />
                </div>
              </div>
              <div>
                <FieldLabel>Organization</FieldLabel>
                <input className={fieldClass} value={leadOrg} onChange={(e) => setLeadOrg(e.target.value)} placeholder="Fund / firm (optional)" />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setAlertEnabled((v) => !v)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
              alertEnabled
                ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-white"
                : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20"
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                alertEnabled ? "border-[var(--color-gold)] bg-[var(--color-gold)]" : "border-white/30"
              )}
            >
              {alertEnabled && <Bell className="h-2.5 w-2.5 text-black" />}
            </span>
            <span>
              Email me when matching opportunities change
              <span className="block text-[11px] text-white/50">Alert delivery activates once email is enabled.</span>
            </span>
          </button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {isSignedIn ? "Save search" : "Register interest"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
