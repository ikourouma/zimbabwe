/**
 * Send all four Strategic Partnerships inquiry-lifecycle emails to a real inbox so delivery can be
 * positively observed — `sendEmail` swallows failures by design (see lib/email/send.ts), so a
 * green request here proves nothing on its own; check the inbox (and spam folder) for four
 * messages. Qualified Investor banner + pilot closeout plan, `email-test`.
 *
 * Run: npx tsx --env-file=.env.local scripts/send-test-email.ts [--to you@example.com]
 *
 * Until zidaproject.com is Verified in Resend, sends from an unverified domain return a 403 that
 * this script surfaces per-template rather than swallowing (unlike the app's own fire-and-forget
 * call sites) — if every send fails, that is almost certainly why. A quick way to prove the API
 * key/code path works with zero DNS changes: temporarily set
 * RESEND_FROM_EMAIL="onboarding@resend.dev" and send only to the address the Resend account is
 * registered under (any other recipient gets a 403 from the sandbox domain).
 */
import {
  sendApplicantApprovedEmail,
  sendApplicantChangesRequestedEmail,
  sendApplicantDeclinedEmail,
  sendStaffNewSubmissionEmail,
} from "@/lib/email/inquiry-notifications";

const toArgIndex = process.argv.indexOf("--to");
const to = toArgIndex !== -1 ? process.argv[toArgIndex + 1] : process.env.RESEND_REPLY_TO || "admin@zidaproject.com";

if (!process.env.RESEND_API_KEY) {
  console.error("RESEND_API_KEY is not set — sendEmail will skip every send. Set it in .env.local first.");
  process.exit(1);
}

async function run() {
  console.log(`Sending 4 test emails to ${to} ...\n`);

  const results: { label: string; ok: boolean }[] = [];

  results.push({
    label: "Applicant — approved",
    ok: await sendApplicantApprovedEmail({ to, name: "Test Applicant" }),
  });

  results.push({
    label: "Applicant — changes requested",
    ok: await sendApplicantChangesRequestedEmail({
      to,
      name: "Test Applicant",
      reviewNotes: "Please provide your company's business registration ID and corporate website.",
    }),
  });

  results.push({
    label: "Applicant — declined",
    ok: await sendApplicantDeclinedEmail({
      to,
      name: "Test Applicant",
      reviewNotes: "Does not meet the platform's investor criteria at this time.",
    }),
  });

  results.push({
    label: "Staff — new submission alert",
    ok: await sendStaffNewSubmissionEmail({
      organization: "Acme Capital Partners",
      name: "Test Applicant",
      email: "test-applicant@example.com",
    }),
  });

  console.log("Results (sendEmail returning `true` means Resend accepted the request — it does not");
  console.log("guarantee inbox delivery; check the actual inbox to confirm):\n");
  for (const r of results) {
    console.log(`  ${r.ok ? "✅" : "❌"} ${r.label}`);
  }

  const failed = results.filter((r) => !r.ok).length;
  if (failed > 0) {
    console.log(
      `\n${failed} of ${results.length} send(s) reported failure — check the [email] console.error lines above ` +
        "for the Resend error. A 403 usually means the sending domain isn't Verified yet; a 401 " +
        '("API key is invalid") means RESEND_API_KEY itself is wrong, expired, or revoked — ' +
        "regenerate it in the Resend dashboard and update .env.local before touching DNS."
    );
    process.exit(1);
  }
  console.log(`\nAll ${results.length} sends reported success. Now check ${to}'s inbox (and spam folder).`);
}

void run();
