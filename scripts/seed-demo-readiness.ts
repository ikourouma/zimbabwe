/**
 * Idempotent demo-readiness seed for the stakeholder walkthrough.
 *
 * Creates the `+demo` cohort and the data the eight guides in docs/walkthrough/ describe but the
 * production database does not yet contain: verification-complete profiles (without which the
 * headline "approve a qualified investor" step fails), an investor organisation with a real team,
 * memoranda mid-negotiation, a review queue with depth in every staffed ministry, and pending
 * applications several people can each approve.
 *
 * Deliberately NOT `npm run db:seed`, which deletes project junction rows and resets pilot
 * passwords. This follows the check-first backfill pattern of scripts/seed-demo-states.ts: read
 * the current state, change only what is missing, and report what it skipped.
 *
 *   npx tsx --env-file=.env.local scripts/seed-demo-readiness.ts            # dry run (default)
 *   npx tsx --env-file=.env.local scripts/seed-demo-readiness.ts --commit   # actually write
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, sql } from "drizzle-orm";
import {
  engagementMous,
  investorEngagements,
  orgInvites,
  profiles,
  projects,
  strategicInquiries,
} from "@/lib/db/schema";
import { seedDb, seedPool } from "../lib/db/seed/db";
import { findAuthUserId, setAccountPassword, signUpViaAuthApi } from "../lib/db/seed/accounts";
import {
  DEMO_ACCOUNTS,
  DEMO_APPLICANTS,
  DEMO_TEAM_LINKS,
  demoPassword,
  type DemoAccount,
} from "../lib/db/seed/demo-accounts";

const COMMIT = process.argv.includes("--commit");

/** `blocked` is distinct from `skipped` on purpose. On a dry run the accounts do not exist yet, so
 *  every step after the first has nothing to inspect — reporting that as "already present" would
 *  tell the reader the opposite of the truth. */
type Change = { step: string; detail: string; action: "created" | "updated" | "skipped" | "blocked" };
const changes: Change[] = [];

const MARKS: Record<Change["action"], string> = { created: "  +", updated: "  +", skipped: "  ·", blocked: "  ?" };
const SUFFIX: Record<Change["action"], string> = {
  created: "",
  updated: "",
  skipped: " (already present)",
  blocked: "",
};

function record(step: string, detail: string, action: Change["action"]) {
  changes.push({ step, detail, action });
  const mark = action === "created" || action === "updated" ? (COMMIT ? "  +" : "  ~") : MARKS[action];
  console.log(`${mark} ${step}: ${detail}${SUFFIX[action]}`);
}

/** In a dry run a missing account is expected, not a fault; in a commit run it is a real failure
 *  worth flagging loudly. */
function missingPrerequisite(step: string, what: string) {
  record(step, COMMIT ? `${what} — PREREQUISITE MISSING` : `${what} — pending account creation`, "blocked");
}

/** Every account in one list, so id lookup and profile writes have a single source. */
const ALL_ACCOUNTS: DemoAccount[] = [...DEMO_ACCOUNTS, ...DEMO_APPLICANTS.map((a) => a.account)];

/** email -> neon_auth user id, filled by step 1 and read by every step after it. */
const userIds = new Map<string, string>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Neon Auth rate-limits sign-ups, and this cohort is three times the size of the pilot one, so a
 *  straight loop gets a 429 partway through and leaves the roster half-created. Pace the calls and
 *  back off when told to. The seed is idempotent either way, but failing mid-run means someone has
 *  to notice and re-run it, which during a demo window is exactly the wrong time to find out. */
const SIGNUP_SPACING_MS = 1_500;
const BACKOFF_MS = [15_000, 30_000, 60_000];

async function signUpWithBackoff(email: string, password: string, name: string) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await signUpViaAuthApi(email, password, name, { syncPassword: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const rateLimited = message.includes("(429)");
      if (!rateLimited || attempt >= BACKOFF_MS.length) throw error;
      const wait = BACKOFF_MS[attempt];
      console.log(`    rate limited — waiting ${wait / 1000}s before retrying ${email}`);
      await sleep(wait);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// 1. Accounts
// ---------------------------------------------------------------------------------------------

async function seedAccounts() {
  console.log(`\n[1/6] Accounts (${ALL_ACCOUNTS.length})`);
  const password = demoPassword();

  for (const account of ALL_ACCOUNTS) {
    const existingId = await findAuthUserId(account.email);

    if (!COMMIT) {
      if (existingId) userIds.set(account.email, existingId);
      record("account", `${account.email} (${account.role})`, existingId ? "skipped" : "created");
      continue;
    }

    let userId: string;
    let created: boolean;

    if (existingId) {
      // Never call the rate-limited sign-up endpoint for an account that already exists. The
      // password is still reset, as a plain DB write, so a re-run repairs an account whose
      // password drifted rather than leaving a stakeholder locked out of a documented address.
      userId = existingId;
      created = false;
      await setAccountPassword(userId, password);
    } else {
      ({ userId, created } = await signUpWithBackoff(account.email, password, account.name));
      await sleep(SIGNUP_SPACING_MS);
    }

    userIds.set(account.email, userId);

    await seedDb
      .insert(profiles)
      .values({
        userId,
        role: account.role,
        accountStatus: "active",
        organization: account.organization,
        ministryId: account.ministryId ?? null,
        jobTitle: account.jobTitle,
        ...(account.kyc
          ? {
              phone: account.kyc.phone,
              hqAddress: account.kyc.hqAddress,
              businessRegistrationId: account.kyc.businessRegistrationId,
              websiteUrl: account.kyc.websiteUrl,
              executiveRepresentativeName: account.kyc.executiveRepresentativeName,
              executiveRepresentativeTitle: account.kyc.executiveRepresentativeTitle,
            }
          : {}),
      })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: {
          role: account.role,
          accountStatus: "active",
          organization: account.organization,
          ministryId: account.ministryId ?? null,
          jobTitle: account.jobTitle,
          ...(account.kyc
            ? {
                phone: account.kyc.phone,
                hqAddress: account.kyc.hqAddress,
                businessRegistrationId: account.kyc.businessRegistrationId,
                websiteUrl: account.kyc.websiteUrl,
                executiveRepresentativeName: account.kyc.executiveRepresentativeName,
                executiveRepresentativeTitle: account.kyc.executiveRepresentativeTitle,
              }
            : {}),
          updatedAt: sql`now()`,
        },
      });

    record("account", `${account.email} (${account.role})`, created ? "created" : "updated");
  }
}

// ---------------------------------------------------------------------------------------------
// 2. Investor organisation team
// ---------------------------------------------------------------------------------------------

async function seedTeamLinks() {
  console.log("\n[2/6] Investor team membership");

  for (const link of DEMO_TEAM_LINKS) {
    const ownerId = userIds.get(link.ownerEmail);
    const memberId = userIds.get(link.memberEmail);
    const member = ALL_ACCOUNTS.find((a) => a.email === link.memberEmail);
    if (!ownerId || !memberId || !member) {
      missingPrerequisite("team", link.memberEmail);
      continue;
    }

    const [existing] = await seedDb
      .select({ id: orgInvites.id, status: orgInvites.status })
      .from(orgInvites)
      .where(and(eq(orgInvites.ownerUserId, ownerId), eq(orgInvites.inviteEmail, link.memberEmail)))
      .limit(1);

    if (existing?.status === "active") {
      record("team", link.memberEmail, "skipped");
      continue;
    }
    if (!COMMIT) {
      record("team", link.memberEmail, existing ? "updated" : "created");
      continue;
    }

    if (existing) {
      await seedDb
        .update(orgInvites)
        .set({ status: "active", invitedUserId: memberId, validatedAt: new Date(), validatedBy: ownerId })
        .where(eq(orgInvites.id, existing.id));
      record("team", link.memberEmail, "updated");
    } else {
      await seedDb.insert(orgInvites).values({
        ownerUserId: ownerId,
        inviteEmail: link.memberEmail,
        inviteName: member.name,
        status: "active",
        invitedUserId: memberId,
        validatedAt: new Date(),
        validatedBy: ownerId,
        justification: `${member.name} manages portfolio activity on behalf of ${member.organization}.`,
        phone: member.kyc?.phone ?? null,
        address: member.kyc?.hqAddress ?? null,
      });
      record("team", link.memberEmail, "created");
    }
  }
}

// ---------------------------------------------------------------------------------------------
// 3. Pending investor applications
// ---------------------------------------------------------------------------------------------

/** Shaped to match exactly what upsertDraftInquiry() writes for a wizard submission —
 *  `type: strategic_partnership` plus `engagementType: investor` — because the approval route
 *  keys the role upgrade off engagementType and the decline/changes emails key off type. A row
 *  missing either is invisible to the workflow the ZIDA Admin guide documents. */
async function seedApplications() {
  console.log("\n[3/6] Pending investor applications");

  for (const { account, application } of DEMO_APPLICANTS) {
    const userId = userIds.get(account.email);
    if (!userId || !account.kyc) {
      missingPrerequisite("application", account.organization ?? account.email);
      continue;
    }

    const [existing] = await seedDb
      .select({ id: strategicInquiries.id, status: strategicInquiries.status })
      .from(strategicInquiries)
      .where(eq(strategicInquiries.userId, userId))
      .limit(1);

    if (existing) {
      record("application", `${account.organization} (${existing.status})`, "skipped");
      continue;
    }
    if (!COMMIT) {
      record("application", `${account.organization}`, "created");
      continue;
    }

    await seedDb.insert(strategicInquiries).values({
      type: "strategic_partnership",
      engagementType: "investor",
      status: "pending",
      userId,
      name: account.name,
      email: account.email,
      organization: account.organization,
      phone: account.kyc.phone,
      hqAddress: account.kyc.hqAddress,
      businessRegistrationId: account.kyc.businessRegistrationId,
      websiteUrl: account.kyc.websiteUrl,
      investorType: application.investorType,
      sectorIds: application.sectorIds,
      ticketSizeRange: application.ticketSizeRange,
      message: application.message,
    });
    record("application", `${account.organization}`, "created");
  }
}

// ---------------------------------------------------------------------------------------------
// 4. Engagements and memoranda mid-negotiation
// ---------------------------------------------------------------------------------------------

/** Two approved engagements for the demo investor, carrying memoranda in `drafting` and
 *  `in_review`. The in_review one has the investor side approved and ZIDA's still pending, which
 *  is the only state where a reviewer actually has something to approve — without it the
 *  memorandum step in three guides describes a button nobody can press. */
async function seedEngagementsAndMous() {
  console.log("\n[4/6] Engagements and memoranda");

  const investorId = userIds.get("qualified+demo@zidaproject.com");
  const investor = DEMO_ACCOUNTS.find((a) => a.email === "qualified+demo@zidaproject.com");
  if (!investorId || !investor) {
    missingPrerequisite("engagement", "qualified+demo");
    return;
  }

  const targets: { ministryId: string; mouStatus: "drafting" | "in_review"; ticket: string }[] = [
    { ministryId: "min-energy", mouStatus: "drafting", ticket: "$5M–$25M" },
    { ministryId: "min-agriculture", mouStatus: "in_review", ticket: "$1M–$5M" },
  ];

  for (const target of targets) {
    const [project] = await seedDb
      .select({ id: projects.id, title: projects.title })
      .from(projects)
      .where(
        and(
          eq(projects.primaryBeneficiaryMinistryId, target.ministryId),
          eq(projects.projectStatus, "published"),
        ),
      )
      .limit(1);
    if (!project) {
      record("engagement", `no published project in ${target.ministryId}`, "skipped");
      continue;
    }

    const [existing] = await seedDb
      .select({ id: investorEngagements.id })
      .from(investorEngagements)
      .where(and(eq(investorEngagements.userId, investorId), eq(investorEngagements.projectId, project.id)))
      .limit(1);

    let engagementId = existing?.id ?? null;

    if (!engagementId) {
      if (!COMMIT) {
        record("engagement", `${project.title} -> mou:${target.mouStatus}`, "created");
        continue;
      }
      const [created] = await seedDb
        .insert(investorEngagements)
        .values({
          projectId: project.id,
          investorName: investor.name,
          investorOrganization: investor.organization,
          userId: investorId,
          status: "approved",
          ticketSize: target.ticket,
          signatoryTitle: investor.jobTitle,
          notes: `Demonstration engagement for the stakeholder walkthrough — illustrative and pending official validation.`,
          certifiedAt: new Date(),
          publishedAt: new Date(),
        })
        .returning({ id: investorEngagements.id });
      engagementId = created.id;
      record("engagement", `${project.title}`, "created");
    } else {
      record("engagement", `${project.title}`, "skipped");
    }

    const [existingMou] = await seedDb
      .select({ id: engagementMous.id, status: engagementMous.status })
      .from(engagementMous)
      .where(eq(engagementMous.engagementId, engagementId))
      .limit(1);

    if (existingMou && existingMou.status === target.mouStatus) {
      record("mou", `${project.title} (${target.mouStatus})`, "skipped");
      continue;
    }
    if (!COMMIT) {
      record("mou", `${project.title} -> ${target.mouStatus}`, existingMou ? "updated" : "created");
      continue;
    }

    const content = {
      parties: `ZIDA (on behalf of the Government of Zimbabwe) and ${investor.organization}`,
      projectReference: project.title,
      purpose: `Non-binding framework to explore an indicative investment of ${target.ticket} in "${project.title}", and to align both parties on the scope of collaboration ahead of a binding agreement.`,
      scope:
        "Parties agree to collaborate in good faith on due diligence, site/regulatory facilitation, and structuring for the project referenced above, within the timelines set out in the term bullets below.",
      indicativeCapital: target.ticket,
      nonBindingStatement:
        "This Memorandum of Understanding is non-binding and does not create any legal obligation on either party to proceed with the proposed investment, except for the confidentiality and governing law provisions, which survive termination of discussions.",
      governingLaw:
        "This Memorandum is governed by, and construed in accordance with, the laws of the Republic of Zimbabwe. Any dispute arising from it shall first be referred to good-faith negotiation between the parties.",
    };

    const investorApproval =
      target.mouStatus === "in_review"
        ? { investorApprovedAt: new Date(), investorApprovedBy: investorId }
        : { investorApprovedAt: null, investorApprovedBy: null };

    if (existingMou) {
      await seedDb
        .update(engagementMous)
        .set({ status: target.mouStatus, ...investorApproval, zidaApprovedAt: null, zidaApprovedBy: null, updatedAt: new Date() })
        .where(eq(engagementMous.id, existingMou.id));
      record("mou", `${project.title} -> ${target.mouStatus}`, "updated");
    } else {
      await seedDb.insert(engagementMous).values({
        engagementId,
        status: target.mouStatus,
        content,
        formatting: {},
        ...investorApproval,
      });
      record("mou", `${project.title} -> ${target.mouStatus}`, "created");
    }
  }
}

// ---------------------------------------------------------------------------------------------
// 5. Review queue depth
// ---------------------------------------------------------------------------------------------

/** New projects rather than demotions of published ones: stakeholders browse the public registry
 *  in the same session, and pulling eight live projects off it to fill a queue would trade one
 *  empty screen for another. */
type QueueProject = {
  ministryId: string;
  status: "submitted_for_review" | "under_review";
  title: string;
  slug: string;
  sectorId: string;
  owner: string;
  location: string;
  readiness: string;
  summary: string;
  description: string;
};

const QUEUE_PROJECTS: QueueProject[] = [
  {
    ministryId: "min-agriculture",
    status: "submitted_for_review",
    title: "Mazowe Valley Irrigation Revitalisation",
    slug: "mazowe-valley-irrigation-revitalisation",
    sectorId: "sec-agriculture",
    owner: "Agricultural Rural Development Authority",
    location: "Mazowe District, Mashonaland Central",
    readiness: "Feasibility study completed; awaiting ministry review",
    summary:
      "Rehabilitation of 4,200 hectares of gravity-fed irrigation infrastructure to restore year-round production for smallholder and commercial outgrowers.",
    description:
      "The scheme covers canal rehabilitation, pump station replacement and on-farm distribution across the Mazowe valley. The opportunity is structured for a blended-finance partner willing to combine concessional and commercial capital alongside an outgrower aggregation model.",
  },
  {
    ministryId: "min-energy",
    status: "submitted_for_review",
    title: "Gwanda Solar Park Phase II",
    slug: "gwanda-solar-park-phase-ii",
    sectorId: "sec-renewable-energy",
    owner: "Zimbabwe Power Company",
    location: "Gwanda District, Matabeleland South",
    readiness: "Greenfield; grid connection study completed",
    summary:
      "A 100 MW extension to the Gwanda solar site, with grid interconnection already studied and land secured.",
    description:
      "Phase II builds on the existing Gwanda footprint and targets a power purchase agreement with the national utility. The project is offered on an independent power producer basis with an option for a local equity partner.",
  },
  {
    ministryId: "min-energy",
    status: "under_review",
    title: "Kariba South Pumped Storage Feasibility",
    slug: "kariba-south-pumped-storage-feasibility",
    sectorId: "sec-renewable-energy",
    owner: "Zimbabwe Electricity Transmission and Distribution Company",
    location: "Kariba, Mashonaland West",
    readiness: "Concept stage; pre-feasibility scoping under way",
    summary:
      "Pre-feasibility for a pumped-storage facility to firm intermittent renewable capacity on the northern grid.",
    description:
      "The study will establish head, reservoir siting and interconnection options for a storage facility intended to complement the solar capacity coming onto the network. Technical assistance financing is sought ahead of a full feasibility study.",
  },
  {
    ministryId: "min-industry",
    status: "submitted_for_review",
    title: "Bulawayo Light Manufacturing Cluster",
    slug: "bulawayo-light-manufacturing-cluster",
    sectorId: "sec-manufacturing",
    owner: "Industrial Development Corporation of Zimbabwe",
    location: "Belmont Industrial Area, Bulawayo",
    readiness: "Brownfield; serviced land available within a declared special economic zone",
    summary:
      "Redevelopment of serviced industrial land into a shared-services cluster for light manufacturing and assembly tenants.",
    description:
      "The cluster offers pre-serviced plots, shared warehousing and a common effluent facility within a declared special economic zone. The sponsor is seeking a development partner to build and operate the shared infrastructure.",
  },
  {
    ministryId: "min-industry",
    status: "under_review",
    title: "Redcliff Steel Beneficiation Restart",
    slug: "redcliff-steel-beneficiation-restart",
    sectorId: "sec-manufacturing",
    owner: "Ministry of Industry and Commerce",
    location: "Redcliff, Midlands Province",
    readiness: "Brownfield; plant audit completed, refurbishment scope defined",
    summary:
      "Phased restart of integrated steel-making and downstream beneficiation capacity at the Redcliff complex.",
    description:
      "The opportunity covers refurbishment of the existing plant, captive power arrangements and offtake into regional construction markets. A technical partner with integrated steel operating experience is sought alongside capital.",
  },
];

async function seedReviewQueue() {
  console.log("\n[5/6] Review queue depth");

  for (const spec of QUEUE_PROJECTS) {
    const [existing] = await seedDb
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, spec.slug))
      .limit(1);
    if (existing) {
      record("project", `${spec.title} (${spec.status})`, "skipped");
      continue;
    }

    const creatorEmail = `${spec.ministryId}.admin+demo@zidaproject.com`;
    const creatorId = userIds.get(creatorEmail);
    if (!creatorId) {
      missingPrerequisite("project", `${spec.title} (creator ${creatorEmail})`);
      continue;
    }
    if (!COMMIT) {
      record("project", `${spec.title} (${spec.status})`, "created");
      continue;
    }

    await seedDb.insert(projects).values({
      title: spec.title,
      slug: spec.slug,
      sectorId: spec.sectorId,
      primaryBeneficiaryMinistryId: spec.ministryId,
      projectOwner: spec.owner,
      location: spec.location,
      projectReadiness: spec.readiness,
      projectStatus: spec.status,
      opportunitySummary: spec.summary,
      description: spec.description,
      createdBy: creatorId,
      reviewerNotes:
        spec.status === "under_review"
          ? "Under ministry assessment — illustrative demonstration record pending official validation."
          : null,
    });
    record("project", `${spec.title} (${spec.status})`, "created");
  }
}

// ---------------------------------------------------------------------------------------------
// 6. Roster document
// ---------------------------------------------------------------------------------------------

async function writeRoster() {
  console.log("\n[6/6] Roster document");
  if (!COMMIT) {
    record("roster", "docs/DEMO_ACCOUNTS.md", "created");
    return;
  }

  const password = demoPassword();
  const rows = ALL_ACCOUNTS.map(
    (a) => `| ${a.role} | ${a.email} | ${a.name} | ${a.description} |`,
  ).join("\n");

  const content = `# Stakeholder demo accounts (local only — do not commit)

Generated: ${new Date().toISOString()}

Sign in at https://zidaproject.com/auth/sign-in. Every account below uses the same password:

\`${password}\`

Naming rule: \`<org>.admin\` runs the org, \`<org>.team\` works in it.

| Role | Email | Name | What it's for |
| --- | --- | --- | --- |
${rows}

## Two things to know before distributing

**A \`government\` account sees every ministry's projects.** Ministry affiliation on that role
drives routing and request-filing, not visibility. The ministry-scoped personas are the two
\`ministry_admin\` accounts in each ministry.

**Email to these addresses does not arrive.** There is no mailbox behind them, so applicant-facing
notifications bounce. In-app notifications work throughout, and staff alerts are unaffected because
they route to INQUIRY_ALERT_EMAIL. Do not ask a stakeholder to check their inbox.

## After the walkthrough

Deactivate these accounts from /super-admin/users using the per-user **Deactivate (archive)**
action, which sets \`deactivated\` and records a justification. The bulk control labelled "Suspend"
sets \`suspended\` instead, so use the per-user action if you want them archived.
`;

  const docsDir = path.join(process.cwd(), "docs");
  await mkdir(docsDir, { recursive: true });
  await writeFile(path.join(docsDir, "DEMO_ACCOUNTS.md"), content, "utf8");
  record("roster", "docs/DEMO_ACCOUNTS.md", "created");
}

// ---------------------------------------------------------------------------------------------

async function main() {
  console.log(
    COMMIT
      ? "Running in COMMIT mode — changes will be written.\n"
      : "Running as a DRY RUN. Re-run with --commit to write. Lines marked ~ are what would change.\n",
  );

  await seedAccounts();
  await seedTeamLinks();
  await seedApplications();
  await seedEngagementsAndMous();
  await seedReviewQueue();
  await writeRoster();

  const created = changes.filter((c) => c.action === "created").length;
  const updated = changes.filter((c) => c.action === "updated").length;
  const skipped = changes.filter((c) => c.action === "skipped").length;
  const blocked = changes.filter((c) => c.action === "blocked").length;
  console.log(
    `\n${COMMIT ? "Wrote" : "Would write"}: ${created} created, ${updated} updated, ${skipped} already present.`,
  );

  if (blocked > 0 && COMMIT) {
    console.log(`\n${blocked} step(s) could not run because a prerequisite was missing. Investigate before demoing.`);
    process.exitCode = 1;
  } else if (blocked > 0) {
    console.log(
      `\n${blocked} step(s) depend on accounts that do not exist yet, so this dry run could not inspect them.`,
    );
  }
  if (!COMMIT) console.log("Nothing was written. Re-run with: npm run seed:readiness -- --commit");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await seedPool.end();
  });
