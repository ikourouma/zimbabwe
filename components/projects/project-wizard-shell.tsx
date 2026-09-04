"use client";

import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

export interface WizardStepDef {
  label: string;
}

interface ProjectWizardShellProps {
  steps: WizardStepDef[];
  step: number;
  /** Highest step index the user has ever reached — steps up to and including this one are
   *  clickable in the stepper, so a user can jump back to review/fix an earlier step without
   *  losing progress on later ones. */
  furthestStep: number;
  onStepSelect: (index: number) => void;
  autosaveStatus?: AutosaveStatus;
  busy?: boolean;
  onBack: () => void;
  backLabel?: string;
  onSaveExit?: () => void;
  saveExitLabel?: string;
  saveExitDisabled?: boolean;
  onNext?: () => void;
  nextDisabled?: boolean;
  isLastStep: boolean;
  onSubmit?: () => void;
  submitLabel?: string;
  submitDisabled?: boolean;
  /** Extra action(s) rendered alongside Submit on the final step — e.g. a second "Save Draft"
   *  button distinct from the mid-wizard "Save & Exit". */
  extraFooterActions?: React.ReactNode;
  banner?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Shared multi-step, full-page wizard chrome (Platform Feedback Batch v3, Phase 5) — the stepper +
 * footer nav previously duplicated inline inside ProposeProjectWizard, now factored out so the
 * government/admin project wizard can reuse the exact same UX (autosave indicator, free navigation
 * between already-visited steps, consistent Back/Save & Exit/Continue/Submit chrome) instead of
 * drifting from it. Step *content* stays entirely with each caller — this component only owns the
 * stepper, the panel wrapper, and the footer.
 */
export function ProjectWizardShell({
  steps,
  step,
  furthestStep,
  onStepSelect,
  autosaveStatus,
  busy,
  onBack,
  backLabel,
  onSaveExit,
  saveExitLabel = "Save & Exit",
  saveExitDisabled,
  onNext,
  nextDisabled,
  isLastStep,
  onSubmit,
  submitLabel = "Submit",
  submitDisabled,
  extraFooterActions,
  banner,
  children,
}: ProjectWizardShellProps) {
  return (
    <div className="max-w-5xl">
      {banner}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <ol className="flex flex-wrap items-center gap-y-2 gap-x-2">
          {steps.map((s, i) => {
            const reachable = i <= furthestStep;
            return (
              <li key={s.label} className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => reachable && onStepSelect(i)}
                  className={cn(
                    "flex items-center gap-2 rounded-md transition-opacity",
                    reachable ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center rounded-full text-xs font-semibold shrink-0 transition-all",
                      i < step && "h-6 w-6 bg-[var(--color-gold)] text-black",
                      i === step && "h-7 w-7 scale-110 bg-[var(--color-gold)] text-black ring-2 ring-[var(--color-gold)]/50",
                      i > step && "h-6 w-6 bg-white/5 text-[var(--color-text-muted)]"
                    )}
                  >
                    {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      "text-xs whitespace-nowrap",
                      i === step ? "text-white font-medium" : "text-[var(--color-text-muted)]"
                    )}
                  >
                    {s.label}
                  </span>
                </button>
                {i < steps.length - 1 && <span className="w-4 h-px bg-white/10 shrink-0 mx-1" />}
              </li>
            );
          })}
        </ol>

        {autosaveStatus && autosaveStatus !== "idle" && (
          <span
            className="inline-flex items-center gap-1.5 text-[11px] shrink-0"
            style={{ color: autosaveStatus === "error" ? "#f87171" : "var(--color-text-muted)" }}
          >
            {autosaveStatus === "saving" && <Loader2 className="h-3 w-3 animate-spin" />}
            {autosaveStatus === "saving" ? "Saving…" : autosaveStatus === "saved" ? "Saved" : "Autosave failed"}
          </span>
        )}
      </div>

      <div className="dashboard-panel p-5 space-y-4">{children}</div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="inline-flex items-center gap-2 text-sm transition-colors"
          style={{ color: "var(--color-text-muted)" }}
        >
          <ArrowLeft className="w-4 h-4" /> {backLabel ?? (step === 0 ? "Cancel" : "Back")}
        </button>

        <div className="flex items-center gap-3">
          {onSaveExit && (
            <button
              type="button"
              onClick={onSaveExit}
              disabled={busy || saveExitDisabled}
              className="btn-sovereign-ghost text-xs px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {saveExitLabel}
            </button>
          )}
          {!isLastStep && onNext && (
            <button
              type="button"
              onClick={onNext}
              disabled={busy || nextDisabled}
              className="btn-sovereign text-xs px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          )}
          {isLastStep && extraFooterActions}
          {isLastStep && onSubmit && (
            <button
              type="button"
              onClick={onSubmit}
              disabled={busy || submitDisabled}
              className="btn-sovereign text-xs px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {submitLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
