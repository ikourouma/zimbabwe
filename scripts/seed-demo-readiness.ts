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
  projectMessages,
  projects,
  projectWatchlist,
  strategicInquiries,
} from "@/lib/db/schema";
import { NDA_VERSION } from "@/lib/governance/nda";
import { MOU_STATUS_ORDER } from "@/lib/governance/mou-workflow";
import type { MouStatus } from "@/lib/types";
import { seedDb, seedPool } from "../lib/db/seed/db";
import { findAuthUserId, setAccountPassword, signUpViaAuthApi } from "../lib/db/seed/accounts";
import {
  DEMO_ACCOUNTS,
  DEMO_APPLICANTS,
  DEMO_QUEUE_PROJECTS,
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
  console.log(`\n[1/8] Accounts (${ALL_ACCOUNTS.length})`);
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

    const profileValues = {
      role: account.role,
      accountStatus: "active" as const,
      organization: account.organization,
      ministryId: account.ministryId ?? null,
      jobTitle: account.jobTitle,
      // Pre-accept the confidentiality clickwrap. NdaGate is a non-dismissible overlay on the Deal
      // Room and Ministry Desk for every non-staff role, so without this 21 of these 23 accounts
      // open onto a legal dialog instead of the console the guide is describing — and because
      // acceptance is recorded once per account, only the first stakeholder through each persona
      // would ever see it anyway. The gate is documented in the guides with its own screenshot
      // instead, which shows it to every reader rather than to whoever happened to sign in first.
      ndaAcceptedAt: new Date(),
      ndaVersion: NDA_VERSION,
      ndaAcceptedTitle: account.jobTitle,
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
    };

    await seedDb
      .insert(profiles)
      .values({ userId, ...profileValues })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { ...profileValues, updatedAt: sql`now()` },
      });

    record("account", `${account.email} (${account.role})`, created ? "created" : "updated");
  }
}

// ---------------------------------------------------------------------------------------------
// 2. Investor organisation team
// ---------------------------------------------------------------------------------------------

async function seedTeamLinks() {
  console.log("\n[2/8] Investor team membership");

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
  console.log("\n[3/8] Pending investor applications");

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

/**
 * Approved engagements for the demo investor, carrying memoranda across the lifecycle.
 *
 * The `in_review` one has the investor side approved and ZIDA's still pending, which is the only
 * state where a reviewer actually has something to approve — without it the memorandum step in
 * three guides describes a button nobody can press.
 *
 * The later three stages exist because the registry could not otherwise exhibit them. Before the
 * test residue was purged, the only executed memorandum on the platform belonged to an engagement
 * named "MOU Smoke Investor", and Both Parties Approved and Finalized had no example at all — so
 * the MOU guide walked a reader through six stages the screen could only show three of. One fund
 * holding five concurrent memoranda at five different stages is an ordinary picture for an active
 * investor, and it lets the registry demonstrate the whole workflow on one screen.
 */
async function seedEngagementsAndMous() {
  console.log("\n[4/8] Engagements and memoranda");

  const investorId = userIds.get("qualified+demo@zidaproject.com");
  const investor = DEMO_ACCOUNTS.find((a) => a.email === "qualified+demo@zidaproject.com");
  if (!investorId || !investor) {
    missingPrerequisite("engagement", "qualified+demo");
    return;
  }

  const targets: { ministryId: string; mouStatus: MouStatus; ticket: string }[] = [
    { ministryId: "min-energy", mouStatus: "drafting", ticket: "$5M–$25M" },
    { ministryId: "min-agriculture", mouStatus: "in_review", ticket: "$1M–$5M" },
    { ministryId: "min-ict", mouStatus: "both_approved", ticket: "$25M–$100M" },
    { ministryId: "min-industry", mouStatus: "finalized", ticket: "$5M–$25M" },
    { ministryId: "min-housing", mouStatus: "executed", ticket: "$25M–$100M" },
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
      .select({
        id: engagementMous.id,
        status: engagementMous.status,
        investorApprovedBy: engagementMous.investorApprovedBy,
      })
      .from(engagementMous)
      .where(eq(engagementMous.engagementId, engagementId))
      .limit(1);

    // Status alone is not enough to call this done: an earlier run wrote a user id into
    // `investorApprovedBy`, which the panel renders verbatim, so a row can be in the right state
    // and still show a UUID where a name belongs. Every stage from in_review onward carries the
    // investor's approval, so the same check covers all of them.
    const approvalIsWellFormed =
      MOU_STATUS_ORDER.indexOf(target.mouStatus) < MOU_STATUS_ORDER.indexOf("in_review") ||
      existingMou?.investorApprovedBy === investor.name;

    if (existingMou && existingMou.status === target.mouStatus && approvalIsWellFormed) {
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

    // Every one of these fields is rendered verbatim by MouPanel, so each holds a display name
    // rather than a user id — an id here would put a raw UUID on a memorandum in front of
    // stakeholders, which is how the earlier `investorApprovedBy` defect reached the guides.
    //
    // The stamps accumulate rather than replace: a memorandum at `executed` must also carry the
    // approvals and the finalisation that got it there, because the panel reads its progress
    // stepper from these timestamps and not from the status alone. Dates are walked backwards from
    // today so the sequence reads as a negotiation that took weeks rather than one that happened
    // in a single instant.
    const stageIndex = MOU_STATUS_ORDER.indexOf(target.mouStatus);
    const reached = (stage: MouStatus) => stageIndex >= MOU_STATUS_ORDER.indexOf(stage);
    const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
    const zidaApprover = DEMO_ACCOUNTS.find((a) => a.email === "zida.admin+demo@zidaproject.com");

    const stamps = {
      investorApprovedAt: reached("in_review") ? daysAgo(21) : null,
      investorApprovedBy: reached("in_review") ? investor.name : null,
      zidaApprovedAt: reached("both_approved") ? daysAgo(17) : null,
      zidaApprovedBy: reached("both_approved") ? (zidaApprover?.name ?? null) : null,
      finalizedAt: reached("finalized") ? daysAgo(12) : null,
      finalizedBy: reached("finalized") ? (zidaApprover?.name ?? null) : null,
      readyForSignatureAt: reached("ready_for_signature") ? daysAgo(8) : null,
      readyForSignatureBy: reached("ready_for_signature") ? (zidaApprover?.name ?? null) : null,
      executedAt: reached("executed") ? daysAgo(4) : null,
      executedBy: reached("executed") ? (zidaApprover?.name ?? null) : null,
      // Signature metadata only. There is no e-signature capture in this build, and recording one
      // as though there were would misrepresent what the platform does.
      signatureMetadata: reached("executed")
        ? {
            signedLocation: "Harare, Zimbabwe",
            investorSignatory: `${investor.name}, ${investor.jobTitle ?? "Authorised Representative"}`,
            zidaSignatory: `${zidaApprover?.name ?? "ZIDA"}, ${zidaApprover?.jobTitle ?? "Authorised Representative"}`,
          }
        : null,
      // Content freezes at finalisation — the snapshot is what the export renders from that point
      // on, and its absence at earlier stages is what makes the freeze demonstrable.
      contentSnapshot: reached("finalized") ? content : null,
      formattingLocked: reached("ready_for_signature"),
    };

    if (existingMou) {
      await seedDb
        .update(engagementMous)
        .set({ status: target.mouStatus, ...stamps, updatedAt: new Date() })
        .where(eq(engagementMous.id, existingMou.id));
      record("mou", `${project.title} -> ${target.mouStatus}`, "updated");
    } else {
      await seedDb.insert(engagementMous).values({
        engagementId,
        status: target.mouStatus,
        content,
        formatting: {},
        ...stamps,
      });
      record("mou", `${project.title} -> ${target.mouStatus}`, "created");
    }
  }
}

// ---------------------------------------------------------------------------------------------
// 5. Review queue depth
// ---------------------------------------------------------------------------------------------

async function seedReviewQueue() {
  console.log("\n[5/8] Review queue depth");

  for (const spec of DEMO_QUEUE_PROJECTS) {
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
// 6. Investor activity behind the analytics panel
// ---------------------------------------------------------------------------------------------

/**
 * A watchlist and one live conversation for the demo investor.
 *
 * The Deal Room overview's My Analytics panel counts saved projects, engagements, documents
 * downloaded and previewed, and messages sent. Engagements were the only non-zero line, so the
 * flagship investor view demonstrated an analytics capability with a column of noughts beside it,
 * and Recent Activity read "No recent activity yet."
 *
 * Only activity a real account would genuinely accumulate is seeded here. Saving a project and
 * writing to the ZIDA team are things this investor plausibly did. Download and preview counters
 * are deliberately left alone: those figures are backed by audit rows, and an audit trail asserting
 * that someone opened a document they never opened is a different kind of claim from a demonstration
 * record. They stay at zero, and the guides say why.
 */
async function seedInvestorActivity() {
  console.log("\n[6/8] Investor activity");

  const investorId = userIds.get("qualified+demo@zidaproject.com");
  const investor = DEMO_ACCOUNTS.find((a) => a.email === "qualified+demo@zidaproject.com");
  if (!investorId || !investor) {
    missingPrerequisite("activity", "qualified+demo");
    return;
  }

  // Saved from across sectors rather than the two already under engagement — a watchlist that
  // duplicates the pipeline demonstrates nothing about screening.
  const watchable = await seedDb
    .select({ id: projects.id, title: projects.title })
    .from(projects)
    .where(eq(projects.projectStatus, "published"))
    .orderBy(projects.title)
    .limit(4);

  for (const project of watchable) {
    const [existing] = await seedDb
      .select({ id: projectWatchlist.id })
      .from(projectWatchlist)
      .where(and(eq(projectWatchlist.userId, investorId), eq(projectWatchlist.projectId, project.id)))
      .limit(1);
    if (existing) {
      record("watchlist", project.title, "skipped");
      continue;
    }
    if (!COMMIT) {
      record("watchlist", project.title, "created");
      continue;
    }
    await seedDb.insert(projectWatchlist).values({ userId: investorId, projectId: project.id });
    record("watchlist", project.title, "created");
  }

  // One concierge thread. This is the cold-start channel an investor uses to reach ZIDA before any
  // engagement exists, and it is the thread the Communication Hub screenshot shows.
  const [existingThread] = await seedDb
    .select({ id: projectMessages.id })
    .from(projectMessages)
    .where(and(eq(projectMessages.threadOwnerUserId, investorId), eq(projectMessages.scope, "concierge")))
    .limit(1);

  if (existingThread) {
    record("message", "concierge thread", "skipped");
    return;
  }
  if (!COMMIT) {
    record("message", "concierge thread", "created");
    return;
  }

  await seedDb.insert(projectMessages).values({
    scope: "concierge",
    threadOwnerUserId: investorId,
    authorUserId: investorId,
    authorName: investor.name,
    authorRole: "qualified",
    visibility: "investor_visible",
    subject: "Sector guidance ahead of a Q4 allocation",
    body:
      "We are shaping a Q4 allocation across renewable generation and agro-processing and would " +
      "welcome guidance on which of the published opportunities are closest to financial close. " +
      "Demonstration message for the stakeholder walkthrough — illustrative and pending official validation.",
  });
  record("message", "concierge thread", "created");
}

// ---------------------------------------------------------------------------------------------
// 7. A pending amendment request
// ---------------------------------------------------------------------------------------------

/**
 * One amendment request, open and awaiting a ministry decision.
 *
 * Amendments are the mechanism the platform offers for the awkward case: a project is approved or
 * published, so it can no longer be edited directly, and something in it has since turned out to
 * be wrong. Three guides walk a reader through that workflow, and until now every card on the
 * platform demonstrating it had been filed by a test harness — bodies reading "p8 selftest other
 * ministry" and "phase8 selftest decline path", with raw field names and an unformatted 2500000
 * where a currency figure belongs. Purging those left the Review Queue's Pending Requests tab
 * empty and the workflow with nothing to show.
 *
 * The card is filed by a ministry's own reviewing officer against that ministry's own project,
 * which is the eligibility rule the route enforces, and left at `open` so a ministry admin has a
 * live decision to take during a walkthrough rather than a settled one to read about.
 */
async function seedAmendmentRequest() {
  console.log("\n[7/8] Pending amendment request");

  const officerEmail = "min-energy.team+demo@zidaproject.com";
  const officerId = userIds.get(officerEmail);
  const officer = DEMO_ACCOUNTS.find((a) => a.email === officerEmail);
  if (!officerId || !officer) {
    missingPrerequisite("amendment", officerEmail);
    return;
  }

  const [project] = await seedDb
    .select({ id: projects.id, title: projects.title })
    .from(projects)
    .where(
      and(
        eq(projects.primaryBeneficiaryMinistryId, "min-energy"),
        eq(projects.projectStatus, "published")
      )
    )
    .orderBy(projects.title)
    .limit(1);

  if (!project) {
    record("amendment", "no published min-energy project", "skipped");
    return;
  }

  const [existing] = await seedDb
    .select({ id: projectMessages.id })
    .from(projectMessages)
    .where(and(eq(projectMessages.projectId, project.id), eq(projectMessages.kind, "action")))
    .limit(1);

  if (existing) {
    record("amendment", project.title, "skipped");
    return;
  }
  if (!COMMIT) {
    record("amendment", project.title, "created");
    return;
  }

  const reason =
    "The sponsor has revised the capital requirement following completion of the grid connection " +
    "study, and the direct employment figure has been restated on the same basis. Requesting an " +
    "amendment so the published record matches the current feasibility position.";

  await seedDb.insert(projectMessages).values({
    projectId: project.id,
    authorUserId: officerId,
    authorName: officer.name,
    authorRole: "government",
    visibility: "investor_visible",
    kind: "action",
    payload: {
      type: "project_amendment_request",
      reason,
      proposedChanges: { capitalRequired: "US$62 million", jobsDirect: 340 },
      status: "open",
      requestingMinistryId: "min-energy",
      requestingMinistryName: "Ministry of Energy and Power Development",
    },
    body:
      `Amendment requested — proposed changes to: capitalRequired, jobsDirect. ${reason} ` +
      `Routed to Ministry of Energy and Power Development's Ministry Admin for first review.`,
  });
  record("amendment", project.title, "created");
}

// ---------------------------------------------------------------------------------------------
// 8. Roster document
// ---------------------------------------------------------------------------------------------

async function writeRoster() {
  console.log("\n[8/8] Roster document");
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
  await seedInvestorActivity();
  await seedAmendmentRequest();
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
