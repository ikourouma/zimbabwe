/**
 * Proves the staff new-submission alert actually sends from production.
 *
 *   npx tsx --env-file=.env.local scripts/verify-inquiry-email.ts
 *   npx tsx --env-file=.env.local scripts/verify-inquiry-email.ts https://zidaproject.com
 *
 * The Registered Investor guide tells stakeholders that "ZIDA staff receive an email alert" when
 * an application is submitted. Nothing had ever confirmed that against production, and the whole
 * path is fire-and-forget by design — sendEmail() swallows its own failures so a mail outage can
 * never block a submission — which means a broken key would look exactly like success from the
 * outside. This drives a real submission through the real API and then asks Resend whether the
 * message left the building.
 *
 * Self-cleaning: the disposable applicant and its inquiry are removed at the end, so the demo
 * review queue is left exactly as it was found.
 */
import { sql } from "drizzle-orm";
import { seedDb, seedPool } from "../lib/db/seed/db";

const targetBase = process.argv[2]?.replace(/\/$/, "") ?? "https://zidaproject.com";
const authBase = process.env.NEON_AUTH_BASE_URL;
const password = process.env.DEMO_ACCOUNT_PASSWORD ?? process.env.PILOT_ACCOUNT_PASSWORD;

// Matches TEST_PATTERNS in scripts/cleanup-test-accounts.ts, so even if this script dies partway
// through, the account is already classified as disposable rather than becoming permanent litter.
const EMAIL = `e2e+mailcheck-${Date.now()}@zidaproject.com`;
const NAME = "Mail Delivery Check";

function ok(label: string) {
  console.log(`  PASS  ${label}`);
}
function bad(label: string, detail?: string) {
  console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  process.exitCode = 1;
}

async function main() {
  if (!authBase) throw new Error("NEON_AUTH_BASE_URL is required");
  if (!password) throw new Error("DEMO_ACCOUNT_PASSWORD or PILOT_ACCOUNT_PASSWORD is required");

  console.log(`Target: ${targetBase}\nApplicant: ${EMAIL}\n`);

  // 1. Disposable applicant.
  const signUp = await fetch(`${authBase}/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: targetBase },
    body: JSON.stringify({ email: EMAIL, password, name: NAME, callbackURL: `${targetBase}/` }),
  });
  if (!signUp.ok) {
    bad("create disposable applicant", `${signUp.status} ${await signUp.text()}`);
    return;
  }
  ok("create disposable applicant");

  const signIn = await fetch(`${authBase}/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: targetBase },
    body: JSON.stringify({ email: EMAIL, password, callbackURL: `${targetBase}/` }),
  });
  if (!signIn.ok) {
    bad("sign in", String(signIn.status));
    return;
  }
  const cookies = (signIn.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  ok("sign in");

  // 2. Submit a complete investor application. PATCH is the wizard's submit path — the same route
  //    that fires sendStaffNewSubmissionEmail — and it re-validates every field server-side, so a
  //    200 here also proves the payload is genuinely wizard-complete.
  const submittedAt = new Date();
  const application = {
    engagementType: "investor",
    name: NAME,
    email: EMAIL,
    organization: "Mail Delivery Check Ltd",
    phone: "+263 242 555 0100",
    hqAddress: "1 Verification Road, Harare, Zimbabwe",
    businessRegistrationId: "ZW-CHECK-0001",
    websiteUrl: "https://example.com",
    investorType: "Institutional Investor",
    sectorIds: ["sec-ict"],
    ticketSizeRange: "$1M–$5M",
    message: "Automated delivery check for the staff notification path. Safe to ignore and delete.",
  };

  const submit = await fetch(`${targetBase}/api/inquiries/draft`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", cookie: cookies },
    body: JSON.stringify(application),
  });
  if (!submit.ok) {
    bad("submit application", `${submit.status} ${await submit.text()}`);
  } else {
    ok("submit application");
  }

  // 3. Ask Resend whether the alert actually went out. This is the only step that distinguishes
  //    "the request succeeded" from "the email was sent" — everything above is true even with a
  //    dead API key, because the send is deliberately non-blocking.
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.log("\n  SKIP  Resend check — RESEND_API_KEY not set locally.");
  } else {
    await new Promise((r) => setTimeout(r, 4000));
    const list = await fetch("https://api.resend.com/emails", {
      headers: { Authorization: `Bearer ${resendKey}` },
    });
    if (!list.ok) {
      console.log(`\n  SKIP  Resend check — list endpoint returned ${list.status}. Check the inbox by hand.`);
    } else {
      const body = (await list.json()) as { data?: { subject?: string; to?: string[]; created_at?: string }[] };
      const match = (body.data ?? []).find(
        (e) =>
          e.subject?.includes("Mail Delivery Check Ltd") &&
          new Date(e.created_at ?? 0).getTime() >= submittedAt.getTime() - 60_000,
      );
      if (match) {
        ok(`Resend accepted the staff alert -> ${match.to?.join(", ")}`);
      } else {
        bad(
          "Resend has no record of the staff alert",
          "production's RESEND_API_KEY may differ from the local one, or the send failed — check admin@zidaproject.com",
        );
      }
    }
  }

  // 4. Leave production as we found it.
  const users = await seedDb.execute<{ id: string }>(
    sql`SELECT id FROM neon_auth."user" WHERE email = ${EMAIL} LIMIT 1`,
  );
  const userId = users.rows[0]?.id;
  if (userId) {
    await seedDb.execute(sql`DELETE FROM strategic_inquiries WHERE user_id = ${userId}`);
    await seedDb.execute(sql`DELETE FROM audit_logs WHERE actor_user_id = ${userId}`);
    await seedDb.execute(sql`DELETE FROM profiles WHERE user_id = ${userId}`);
    await seedDb.execute(sql`DELETE FROM neon_auth."user" WHERE id = ${userId}`);
    ok("cleaned up the disposable applicant and its inquiry");
  } else {
    bad("cleanup", "could not find the disposable user to remove");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await seedPool.end();
  });
