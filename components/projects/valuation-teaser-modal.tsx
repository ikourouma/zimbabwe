"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileSearch, Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useLeadCapture } from "@/context/lead-capture-context";
import type { InvestmentProject } from "@/lib/types";
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

// Mirrors the Strategic Partnerships wizard so leads carry a consistent investor profile shape.
const investorTypes = [
  "Individual Investor",
  "Institutional Investor",
  "Development Finance Institution",
  "Private Equity / Venture Capital",
  "Strategic / Corporate",
  "Government / Institutional",
];
const ticketSizeRanges = ["<$1M", "$1M–$5M", "$5M–$25M", "$25M+", "Not yet determined"];

const fieldClass =
  "w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[var(--color-gold)] focus:outline-none";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
      {children}
    </label>
  );
}

interface ValuationTeaserModalProps {
  project: InvestmentProject;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ValuationTeaserModal({ project, open, onOpenChange }: ValuationTeaserModalProps) {
  const { name, email, organization } = useAuth();
  const { addInquiry } = useLeadCapture();

  const [form, setForm] = useState({
    name: name ?? "",
    email: email ?? "",
    organization: organization ?? "",
    investorType: "",
    ticketSizeRange: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const update = (patch: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...patch }));

  const canSubmit = form.name.trim().length > 0 && /.+@.+\..+/.test(form.email) && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await addInquiry({
        type: "valuation_teaser",
        name: form.name.trim(),
        email: form.email.trim(),
        organization: form.organization.trim() || undefined,
        projectId: project.id,
        investorType: form.investorType || undefined,
        ticketSizeRange: form.ticketSizeRange || undefined,
        message: form.message.trim() || undefined,
      });
      toast.success("Request received", {
        description: "Our deal team will prepare a valuation teaser and follow up shortly.",
      });
      onOpenChange(false);
      setForm((prev) => ({ ...prev, investorType: "", ticketSizeRange: "", message: "" }));
    } catch {
      toast.error("Could not submit your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSearch className="h-4 w-4 text-[var(--color-gold)]" />
            Request Valuation Teaser
          </DialogTitle>
          <DialogDescription>
            {project.title} is at concept stage — its capital buildout is still being structured. Register your
            interest and our deal team will prepare a valuation teaser as figures are finalized.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Full name</FieldLabel>
              <input
                className={fieldClass}
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="Jane Investor"
              />
            </div>
            <div>
              <FieldLabel>Work email</FieldLabel>
              <input
                type="email"
                className={fieldClass}
                value={form.email}
                onChange={(e) => update({ email: e.target.value })}
                placeholder="jane@fund.com"
              />
            </div>
          </div>

          <div>
            <FieldLabel>Organization</FieldLabel>
            <input
              className={fieldClass}
              value={form.organization}
              onChange={(e) => update({ organization: e.target.value })}
              placeholder="Fund / firm (optional)"
            />
          </div>

          <div>
            <FieldLabel>Investor profile</FieldLabel>
            <select
              className={cn(fieldClass, "appearance-none")}
              value={form.investorType}
              onChange={(e) => update({ investorType: e.target.value })}
            >
              <option value="">Select type (optional)</option>
              {investorTypes.map((type) => (
                <option key={type} value={type} className="text-black">
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel>Indicative ticket size</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {ticketSizeRanges.map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => update({ ticketSizeRange: form.ticketSizeRange === range ? "" : range })}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    form.ticketSizeRange === range
                      ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-black"
                      : "border-white/10 bg-white/[0.03] text-white/80 hover:border-[var(--color-gold)]"
                  )}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>Message (optional)</FieldLabel>
            <textarea
              className={cn(fieldClass, "min-h-20 resize-y")}
              value={form.message}
              onChange={(e) => update({ message: e.target.value })}
              placeholder="Anything specific you'd like the teaser to address?"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Request teaser
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
