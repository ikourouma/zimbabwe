"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Printer, Send } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InvestorEngagement } from "@/lib/types";

interface ProjectOption {
  id: string;
  title: string;
}

interface NewEngagementWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectOption[];
  /** Pre-selects a project (e.g. when launched from that project's drawer). */
  defaultProjectId?: string;
  defaultInvestorName: string;
  /** Qualified investor self-initiating: locked-name flow requiring a certification attestation to
   *  publish. Staff (admin/gov) log on an investor's behalf (editable name, no certification), but
   *  still choose Save Draft vs Publish so every engagement supports the draft lifecycle. */
  canSelfInitiate: boolean;
  addEngagement: (engagement: InvestorEngagement) => Promise<InvestorEngagement>;
  publishEngagement: (id: string, payload: Record<string, unknown>) => Promise<boolean>;
  onCreated?: (engagement: InvestorEngagement) => void;
}

const STEPS = ["Parties & Project", "Investment Details", "Review", "Submit"];

/** Muted label for dark dialogs — the shared <Label> has no color and dialogs portal outside the
 *  .dashboard-shell, so an explicit muted color keeps it legible. */
function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-medium mb-1 block" style={{ color: "var(--color-text-muted)" }}>
      {children}
    </label>
  );
}

export function NewEngagementWizard({
  open,
  onOpenChange,
  projects,
  defaultProjectId = "",
  defaultInvestorName,
  canSelfInitiate,
  addEngagement,
  publishEngagement,
  onCreated,
}: NewEngagementWizardProps) {
  const [step, setStep] = useState(0);
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [investorName, setInvestorName] = useState(defaultInvestorName);
  const [organization, setOrganization] = useState("");
  const [ticketSize, setTicketSize] = useState("");
  const [signatoryTitle, setSignatoryTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [certified, setCertified] = useState(false);
  const [busy, setBusy] = useState(false);

  const projectTitle = projects.find((p) => p.id === projectId)?.title ?? "";

  function reset() {
    setStep(0);
    setProjectId(defaultProjectId);
    setInvestorName(defaultInvestorName);
    setOrganization("");
    setTicketSize("");
    setSignatoryTitle("");
    setNotes("");
    setCertified(false);
  }

  function close() {
    onOpenChange(false);
    // Defer reset so it doesn't flash during the dialog close animation.
    setTimeout(reset, 200);
  }

  function canAdvance(): boolean {
    if (step === 0) return Boolean(projectId) && investorName.trim().length > 0;
    return true;
  }

  async function createDraft(): Promise<InvestorEngagement | null> {
    try {
      // Always create as a draft; publishing is a separate, explicit step (below) for every role.
      return await addEngagement({
        id: "",
        projectId,
        investorName: investorName.trim(),
        investorOrganization: organization.trim() || undefined,
        ticketSize: ticketSize.trim() || undefined,
        signatoryTitle: signatoryTitle.trim() || undefined,
        notes: notes.trim() || undefined,
        status: "draft",
        createdAt: "",
        updatedAt: "",
      });
    } catch {
      toast.error("Could not create the engagement.");
      return null;
    }
  }

  async function handleSaveDraft() {
    setBusy(true);
    const created = await createDraft();
    setBusy(false);
    if (created) {
      toast.success("Draft saved. You can publish it when ready.");
      onCreated?.(created);
      close();
    }
  }

  async function handlePublish() {
    // Investors must certify with a signatory title; staff publish directly (no attestation).
    if (canSelfInitiate && !signatoryTitle.trim()) {
      toast.error("A signatory title is required to publish.");
      setStep(1);
      return;
    }
    setBusy(true);
    const created = await createDraft();
    if (!created) {
      setBusy(false);
      return;
    }
    const payload: Record<string, unknown> = canSelfInitiate
      ? { status: "submitted", certified: true, signatoryTitle: signatoryTitle.trim() }
      : { status: "submitted" };
    const ok = await publishEngagement(created.id, payload);
    setBusy(false);
    if (ok) {
      toast.success(
        canSelfInitiate
          ? "Engagement certified, published, and locked for ZIDA review."
          : "Engagement published."
      );
      onCreated?.(created);
      close();
    }
  }

  function printSummary() {
    const rows: [string, string][] = [
      ["Project", projectTitle],
      ["Investor", investorName],
      ["Organization", organization || "—"],
      ["Indicative ticket size", ticketSize || "—"],
      ["Authorized signatory", signatoryTitle || "—"],
      ["Notes / thesis", notes || "—"],
      ["Prepared", new Date().toLocaleString()],
    ];
    const html = `<!doctype html><html><head><title>Engagement Summary</title>
      <style>
        body{font-family:Georgia,serif;color:#111;margin:48px;max-width:720px}
        h1{font-size:20px;border-bottom:2px solid #006400;padding-bottom:8px}
        table{width:100%;border-collapse:collapse;margin-top:16px}
        th{text-align:left;width:220px;vertical-align:top;padding:8px 12px 8px 0;color:#555;font-size:12px;text-transform:uppercase;letter-spacing:.5px}
        td{padding:8px 0;border-bottom:1px solid #eee}
        .foot{margin-top:32px;font-size:11px;color:#888}
      </style></head><body>
      <h1>Zimbabwe Investment Platform — Engagement Summary</h1>
      <table>${rows
        .map(([k, v]) => `<tr><th>${k}</th><td>${String(v).replace(/</g, "&lt;")}</td></tr>`)
        .join("")}</table>
      <p class="foot">Draft summary for review. Not a binding offer. Generated from the ZIDA Deal Room.</p>
      </body></html>`;
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) {
      toast.error("Enable pop-ups to print the summary.");
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{canSelfInitiate ? "Start an Engagement" : "Log an Engagement"}</DialogTitle>
          <DialogDescription>
            {canSelfInitiate
              ? "Register your interest in a project. Save as a private draft, or certify and publish to submit it to the ZIDA deal team."
              : "Record an investor engagement against a project. Save as a draft or publish it straight away."}
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <ol className="flex items-center gap-2 mb-4">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                  i < step && "bg-[var(--color-gold)] text-black",
                  i === step && "bg-[var(--color-gold)]/20 text-[var(--color-gold)] ring-1 ring-[var(--color-gold)]",
                  i > step && "bg-white/5 text-[var(--color-text-muted)]"
                )}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className={cn("text-xs hidden sm:inline", i === step ? "text-white" : "text-[var(--color-text-muted)]")}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && <span className="w-4 h-px bg-white/10" />}
            </li>
          ))}
        </ol>

        {/* Step body */}
        <div className="min-h-[220px] space-y-3">
          {step === 0 && (
            <>
              <div>
                <FieldLabel>Project</FieldLabel>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title.slice(0, 60)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel htmlFor="wiz-name">Investor name</FieldLabel>
                <input
                  id="wiz-name"
                  className="dashboard-input"
                  value={investorName}
                  onChange={(e) => setInvestorName(e.target.value)}
                  disabled={canSelfInitiate}
                />
                {canSelfInitiate && (
                  <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>
                    Taken from your verified account.
                  </p>
                )}
              </div>
              <div>
                <FieldLabel htmlFor="wiz-org">Organization</FieldLabel>
                <input id="wiz-org" className="dashboard-input" value={organization} onChange={(e) => setOrganization(e.target.value)} />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <FieldLabel htmlFor="wiz-ticket">Indicative ticket size</FieldLabel>
                <input id="wiz-ticket" className="dashboard-input" placeholder="e.g. USD 10-15M" value={ticketSize} onChange={(e) => setTicketSize(e.target.value)} />
              </div>
              <div>
                <FieldLabel htmlFor="wiz-sig">Authorized signatory title</FieldLabel>
                <input id="wiz-sig" className="dashboard-input" placeholder="e.g. Managing Director" value={signatoryTitle} onChange={(e) => setSignatoryTitle(e.target.value)} />
                {canSelfInitiate && (
                  <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>
                    Required to certify and publish.
                  </p>
                )}
              </div>
              <div>
                <FieldLabel htmlFor="wiz-notes">Notes / investment thesis</FieldLabel>
                <textarea id="wiz-notes" className="dashboard-input min-h-[96px]" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">Review the details</p>
                <Button variant="outline" size="sm" onClick={printSummary}>
                  <Printer className="h-3.5 w-3.5 mr-1.5" /> Print summary
                </Button>
              </div>
              <dl className="rounded-md p-3 space-y-2" style={{ border: "1px solid var(--color-sovereign-border)" }}>
                <SummaryRow label="Project" value={projectTitle} />
                <SummaryRow label="Investor" value={investorName} />
                <SummaryRow label="Organization" value={organization || "—"} />
                <SummaryRow label="Ticket size" value={ticketSize || "—"} />
                <SummaryRow label="Signatory" value={signatoryTitle || "—"} />
                <SummaryRow label="Notes" value={notes || "—"} />
              </dl>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {canSelfInitiate ? (
                <>
                  <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    Save this as a private <strong>draft</strong> to keep editing, or certify and publish to submit it to
                    the ZIDA deal team. Publishing <strong>locks</strong> the record — later changes require a formal
                    correction request.
                  </p>
                  <label className="flex items-start gap-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    <input type="checkbox" className="mt-0.5" checked={certified} onChange={(e) => setCertified(e.target.checked)} />
                    <span>
                      I certify, as <strong>{signatoryTitle || "the authorized signatory"}</strong>, that this
                      information is accurate and that I am authorized to submit it on behalf of{" "}
                      {organization || "my organization"}.
                    </span>
                  </label>
                </>
              ) : (
                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  Save as a draft to keep refining, or publish it now against{" "}
                  <strong>{projectTitle || "the selected project"}</strong>.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="mt-6 flex items-center justify-between">
          <Button variant="secondary" onClick={step === 0 ? close : () => setStep((s) => s - 1)} disabled={busy}>
            {step === 0 ? "Cancel" : "Back"}
          </Button>

          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance()}>
              Next
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleSaveDraft} disabled={busy}>
                Save Draft
              </Button>
              <Button onClick={handlePublish} disabled={busy || (canSelfInitiate && !certified)}>
                <Send className="h-4 w-4 mr-1.5" /> {canSelfInitiate ? "Certify & Publish" : "Publish"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <dt className="w-28 shrink-0 text-xs uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </dt>
      <dd className="text-white break-words">{value}</dd>
    </div>
  );
}
