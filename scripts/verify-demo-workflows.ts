/**
 * Exercises the three workflows the guides lead with and that nothing else covers.
 *
 *   npx tsx --env-file=.env.local scripts/verify-demo-workflows.ts
 *
 * These are the steps most likely to fail in front of an audience, because each depends on seeded
 * state being not merely present but correctly shaped:
 *
 *   1. Approving an investor application, which is refused unless the applicant's five KYC fields
 *      are complete, and which must actually change the account's role rather than a CRM status.
 *   2. Approving a memorandum from both sides, which only unlocks from `in_review` and requires
 *      the confidentiality gate to already be accepted.
 *   3. Opening My Team, which reads org_invites rather than roles, so three qualified accounts can
 *      look correct in the user directory and still show an empty team.
 *
 * Every change is undone: the disposable applicant is deleted, and the memorandum is put back into
 * `in_review` with the investor-side approval it started with.
 */
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { engagementMous, investorEngagements } from "@/lib/db/schema";
import { seedDb, seedPool } from "../lib/db/seed/db";

const targetBase = process.argv[2]?.replace(/\/$/, "") ?? "https://zidaproject.com";
const authBase = process.env.NEON_AUTH_BASE_URL;
const password = process.env.DEMO_ACCOUNT_PASSWORD ?? process.env.PILOT_ACCOUNT_PASSWORD;

const ZIDA_ADMIN = "zida.admin+demo@zidaproject.com";
const INVESTOR = "qualified+demo@zidaproject.com";
const APPLICANT = `e2e+approval-${Date.now()}@zidaproject.com`;

let pass = 0;
let fail = 0;
function ok(label: string, detail?: string) {
  pass += 1;
  console.log(`  PASS  ${label}${detail ? ` — ${detail}` : ""}`);
}
function bad(label: string, detail?: string) {
  fail += 1;
  console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
}

async function signIn(email: string): Promise<string> {
  const res = await fetch(`${authBase}/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: targetBase },
    body: JSON.stringify({ email, password, callbackURL: `${targetBase}/` }),
  });
  if (!res.ok) throw new Error(`sign-in ${email} -> ${res.status}`);
  return (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
}

// ---------------------------------------------------------------------------------------------

async function checkInvestorApproval() {
  console.log("\n[1/3] Approving an investor application");

  const signUp = await fetch(`${authBase}/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: targetBase },
    body: JSON.stringify({ email: APPLICANT, password, name: "Approval Check", callbackURL: `${targetBase}/` }),
  });
  if (!signUp.ok) {
    bad("create disposable applicant", String(signUp.status));
    return;
  }

  const applicantCookies = await signIn(APPLICANT);
  const submit = await fetch(`${targetBase}/api/inquiries/draft`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", cookie: applicantCookies },
    body: JSON.stringify({
      engagementType: "investor",
      name: "Approval Check",
      email: APPLICANT,
      organization: "Approval Check Holdings",
      phone: "+263 242 555 0101",
      hqAddress: "2 Verification Road, Harare, Zimbabwe",
      businessRegistrationId: "ZW-CHECK-0002",
      websiteUrl: "https://example.com",
      investorType: "Institutional Investor",
      sectorIds: ["sec-ict"],
      ticketSizeRange: "$1M–$5M",
      message: "Automated workflow check. Safe to ignore.",
    }),
  });
  if (!submit.ok) {
    bad("submit application", `${submit.status} ${await submit.text()}`);
    return;
  }
  const inquiry = (await submit.json()) as { id: string };
  ok("submit application");

  const adminCookies = await signIn(ZIDA_ADMIN);
  const approve = await fetch(`${targetBase}/api/inquiries/${inquiry.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", cookie: adminCookies },
    body: JSON.stringify({ status: "approved", reason: "Automated workflow check." }),
  });
  if (!approve.ok) {
    bad("ZIDA Admin approves the application", `${approve.status} ${await approve.text()}`);
  } else {
    ok("ZIDA Admin approves the application");
  }

  // The point of the whole step: role actually changed, not just the inquiry status.
  const role = await seedDb.execute<{ role: string }>(
    sql`SELECT p.role::text AS role FROM profiles p
        JOIN neon_auth."user" u ON u.id::text = p.user_id WHERE u.email = ${APPLICANT}`,
  );
  const newRole = role.rows[0]?.role;
  if (newRole === "qualified") ok("applicant was upgraded to qualified");
  else bad("applicant was upgraded to qualified", `role is ${newRole ?? "missing"}`);

  const users = await seedDb.execute<{ id: string }>(
    sql`SELECT id FROM neon_auth."user" WHERE email = ${APPLICANT} LIMIT 1`,
  );
  const userId = users.rows[0]?.id;
  if (userId) {
    await seedDb.execute(sql`DELETE FROM strategic_inquiries WHERE user_id = ${userId}`);
    await seedDb.execute(sql`DELETE FROM audit_logs WHERE actor_user_id = ${userId}`);
    await seedDb.execute(sql`DELETE FROM profiles WHERE user_id = ${userId}`);
    await seedDb.execute(sql`DELETE FROM neon_auth."user" WHERE id = ${userId}`);
    ok("removed the disposable applicant");
  } else {
    bad("cleanup", "disposable applicant not found");
  }
}

// ---------------------------------------------------------------------------------------------

async function checkMouDualApproval() {
  console.log("\n[2/3] Approving a memorandum from both sides");

  const [mou] = await seedDb
    .select({
      engagementId: engagementMous.engagementId,
      status: engagementMous.status,
      investorApprovedBy: engagementMous.investorApprovedBy,
      investorApprovedAt: engagementMous.investorApprovedAt,
    })
    .from(engagementMous)
    .innerJoin(investorEngagements, eq(investorEngagements.id, engagementMous.engagementId))
    .where(and(eq(engagementMous.status, "in_review"), eq(investorEngagements.status, "approved")))
    .limit(1);

  if (!mou) {
    bad("find a memorandum in review", "none present — the seed did not produce one");
    return;
  }
  ok("found a memorandum awaiting ZIDA approval", `investor side: ${mou.investorApprovedBy}`);

  const adminCookies = await signIn(ZIDA_ADMIN);
  const res = await fetch(`${targetBase}/api/engagements/${mou.engagementId}/mou/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: adminCookies },
    body: JSON.stringify({ action: "approve" }),
  });

  if (!res.ok) {
    bad("ZIDA approves the memorandum", `${res.status} ${await res.text()}`);
  } else {
    const updated = (await res.json()) as { status: string; zidaApprovedBy: string | null };
    if (updated.status === "both_approved") {
      ok("second approval moved it to both_approved", `zida side: ${updated.zidaApprovedBy}`);
    } else {
      bad("second approval moved it to both_approved", `status is ${updated.status}`);
    }
  }

  // Put it back so the demo still has a memorandum waiting for a reviewer to approve.
  await seedDb
    .update(engagementMous)
    .set({
      status: "in_review",
      investorApprovedAt: mou.investorApprovedAt,
      investorApprovedBy: mou.investorApprovedBy,
      zidaApprovedAt: null,
      zidaApprovedBy: null,
    })
    .where(eq(engagementMous.engagementId, mou.engagementId));
  ok("restored the memorandum to in_review");
}

// ---------------------------------------------------------------------------------------------

async function checkMyTeam() {
  console.log("\n[3/3] Opening My Team");

  const cookies = await signIn(INVESTOR);
  const res = await fetch(`${targetBase}/api/org-team/invites`, { headers: { cookie: cookies } });
  if (!res.ok) {
    bad("read the investor's team", String(res.status));
    return;
  }
  const invites = (await res.json()) as { inviteName?: string; status?: string }[];
  const active = invites.filter((i) => i.status === "active");
  if (active.length >= 2) {
    ok(`team has ${active.length} active member(s)`, active.map((i) => i.inviteName).join(", "));
  } else {
    bad("team has at least 2 active members", `found ${active.length} of ${invites.length}`);
  }
}

// ---------------------------------------------------------------------------------------------

async function main() {
  if (!authBase) throw new Error("NEON_AUTH_BASE_URL is required");
  if (!password) throw new Error("DEMO_ACCOUNT_PASSWORD or PILOT_ACCOUNT_PASSWORD is required");
  console.log(`Target: ${targetBase}`);

  await checkInvestorApproval();
  await checkMouDualApproval();
  await checkMyTeam();

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await seedPool.end();
  });
