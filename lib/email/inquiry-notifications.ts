import { emailShell, sendEmail } from "@/lib/email/send";
import { SITE_URL } from "@/lib/config/site";

/** Single ops inbox for the staff new-submission alert — deliberately not fanned out to every
 *  admin account (Qualified Investor banner + pilot closeout plan, Part 4). */
const INQUIRY_ALERT_EMAIL = process.env.INQUIRY_ALERT_EMAIL ?? "admin@zidaproject.com";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function ctaButton(href: string, label: string): string {
  return `<p style="margin: 24px 0;">
    <a href="${href}" style="display:inline-block; background:#FFD300; color:#000; font-weight:600; padding:12px 24px; border-radius:6px; text-decoration:none; font-size:14px;">${escapeHtml(
      label
    )}</a>
  </p>`;
}

/**
 * The four Strategic Partnerships inquiry-lifecycle emails (Qualified Investor banner + pilot
 * closeout plan, Part 4). All four are sent transactionally via `sendEmail` — never through
 * `notifyUser`'s preference-gated path, since `NotificationPreferences` has no key that applies
 * to a decision on someone's own application, and a staff alert isn't a per-user preference at
 * all. Every applicant-facing email falls back to the inquiry's own `email` column as `to` — the
 * approval/decision workflow is explicitly permitted to run with no matched Neon Auth account yet.
 */

/** "Approved" — investor-specific copy (Deal Room access, NDA-on-first-visit) since this is only
 *  ever sent when `engagementType === "investor"` and the role upgrade actually applied. */
export async function sendApplicantApprovedEmail(input: { to: string; name: string }): Promise<boolean> {
  const html = emailShell(
    `
    <h1 style="font-size:18px; margin:0 0 12px; color:#111827;">Your Qualified Investor application is approved</h1>
    <p style="font-size:14px; line-height:1.6; color:#374151;">Hi ${escapeHtml(input.name)},</p>
    <p style="font-size:14px; line-height:1.6; color:#374151;">
      ZIDA has reviewed and approved your Qualified Investor application. Your account now has full Deal Room
      access — you can log Engagements, use the Communication Hub, and propose your own projects. The Deal Room
      NDA will be presented the first time you visit.
    </p>
    ${ctaButton(`${SITE_URL}/deal-room`, "Go to the Deal Room")}
  `,
    { transactional: true }
  );
  return sendEmail({ to: input.to, subject: "Your Qualified Investor application is approved", html });
}

/** "Changes requested" — quotes the reviewer's note verbatim since that text is the whole
 *  instruction; links back into the resumable wizard (see GET /api/inquiries/draft). */
export async function sendApplicantChangesRequestedEmail(input: {
  to: string;
  name: string;
  reviewNotes: string | null;
}): Promise<boolean> {
  const html = emailShell(
    `
    <h1 style="font-size:18px; margin:0 0 12px; color:#111827;">ZIDA has requested changes to your application</h1>
    <p style="font-size:14px; line-height:1.6; color:#374151;">Hi ${escapeHtml(input.name)},</p>
    <p style="font-size:14px; line-height:1.6; color:#374151;">
      Your Strategic Partnerships application needs a little more information before ZIDA can complete its
      review${input.reviewNotes ? ":" : "."}
    </p>
    ${
      input.reviewNotes
        ? `<blockquote style="margin:16px 0; padding:12px 16px; background:#fffbea; border-left:3px solid #FFD300; font-size:14px; color:#374151;">${escapeHtml(
            input.reviewNotes
          )}</blockquote>`
        : ""
    }
    <p style="font-size:14px; line-height:1.6; color:#374151;">Resume your application to add what's missing and resubmit.</p>
    ${ctaButton(`${SITE_URL}/strategic-partnerships`, "Resume application")}
  `,
    { transactional: true }
  );
  return sendEmail({ to: input.to, subject: "ZIDA has requested changes to your application", html });
}

/** "Declined" — currently the *only* feedback a declined applicant gets, in-app or otherwise
 *  (there is no in-app declined-state affordance beyond the checklist's own status text). */
export async function sendApplicantDeclinedEmail(input: {
  to: string;
  name: string;
  reviewNotes: string | null;
}): Promise<boolean> {
  const html = emailShell(
    `
    <h1 style="font-size:18px; margin:0 0 12px; color:#111827;">Update on your Qualified Investor application</h1>
    <p style="font-size:14px; line-height:1.6; color:#374151;">Hi ${escapeHtml(input.name)},</p>
    <p style="font-size:14px; line-height:1.6; color:#374151;">
      After review, ZIDA is not able to approve your Qualified Investor application at this time${
        input.reviewNotes ? ":" : "."
      }
    </p>
    ${
      input.reviewNotes
        ? `<blockquote style="margin:16px 0; padding:12px 16px; background:#fef2f2; border-left:3px solid #f87171; font-size:14px; color:#374151;">${escapeHtml(
            input.reviewNotes
          )}</blockquote>`
        : ""
    }
    <p style="font-size:14px; line-height:1.6; color:#374151;">
      If you have questions about this decision, reply to this email and a member of the ZIDA team will follow up.
    </p>
  `,
    { transactional: true }
  );
  return sendEmail({ to: input.to, subject: "Update on your Qualified Investor application", html });
}

/** Staff alert — fired on wizard submit (PATCH /api/inquiries/draft), the same moment that now
 *  also logs the missing `inquiry.submitted` audit row. */
export async function sendStaffNewSubmissionEmail(input: { organization: string; name: string; email: string }): Promise<boolean> {
  const html = emailShell(
    `
    <h1 style="font-size:18px; margin:0 0 12px; color:#111827;">New Qualified Investor application</h1>
    <p style="font-size:14px; line-height:1.6; color:#374151;">
      ${escapeHtml(input.name)} (${escapeHtml(input.email)}) at <strong>${escapeHtml(
      input.organization
    )}</strong> submitted a Qualified Investor application.
    </p>
    ${ctaButton(`${SITE_URL}/admin/inquiries?status=pending&category=investor`, "Review pending applications")}
  `,
    { transactional: true }
  );
  return sendEmail({
    to: INQUIRY_ALERT_EMAIL,
    subject: `New Qualified Investor application from ${input.organization}`,
    html,
  });
}
