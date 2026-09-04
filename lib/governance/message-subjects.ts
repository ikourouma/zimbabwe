/**
 * Curated subject/reason list shared by every message composer (Platform Feedback Batch v4,
 * Phase 2 + follow-up) — gives every thread the same "what is this about" context whether it's a
 * brand-new Communication Hub thread (new-message-modal.tsx) or a reply/continuation inside an
 * existing project/engagement thread (message-thread.tsx). "Other" reveals a free-text field.
 */
export const SUBJECT_OPTIONS = [
  "Project Inquiry",
  "Compliance Question",
  "Technical Support",
  "Partnership Opportunity",
  "Other",
] as const;

export const OTHER_SUBJECT = "Other";

// Radix Select reserves the empty string for "no selection", so the default "no subject" option
// needs a real sentinel value — mapped back to `undefined` on send.
export const NO_SUBJECT = "__no_subject__";

/** Resolves the curated `subjectOption` + free-text `subjectOther` state pair down to the value
 *  actually persisted: the curated option as-is, the free-text "Other" detail, or undefined when
 *  no subject was picked at all. */
export function resolveSubject(subjectOption: string, subjectOther: string): string | undefined {
  if (subjectOption === NO_SUBJECT) return undefined;
  if (subjectOption === OTHER_SUBJECT) return subjectOther.trim() || OTHER_SUBJECT;
  return subjectOption;
}
