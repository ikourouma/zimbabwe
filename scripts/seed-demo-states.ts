/**
 * Idempotent demo/UAT seed for missing lifecycle states.
 * Run: npx tsx --env-file=.env.local scripts/seed-demo-states.ts
 */
import { eq } from "drizzle-orm";
import {
  accreditationDocuments,
  announcements,
  engagementMous,
  investorEngagements,
  marketingPopups,
  mouFieldComments,
  profiles,
  projectTeamAssignments,
  projects,
  siteContentBlocks,
} from "@/lib/db/schema";
import { seedDb } from "../lib/db/seed/db";

const MARKER = "UAT_DEMO_SEED";

type SeedResult = { label: string; created: boolean; skipped: boolean };

async function ensureSubmittedProject(): Promise<SeedResult> {
  const existing = await seedDb
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.projectStatus, "submitted_for_review"))
    .limit(1);
  if (existing[0]) return { label: "project:submitted_for_review", created: false, skipped: true };

  const [draft] = await seedDb
    .select({ id: projects.id, title: projects.title })
    .from(projects)
    .where(eq(projects.projectStatus, "draft"))
    .limit(1);
  if (!draft) return { label: "project:submitted_for_review", created: false, skipped: true };

  await seedDb
    .update(projects)
    .set({
      projectStatus: "submitted_for_review",
      reviewerNotes: `${MARKER}: submitted_for_review — illustrative pilot record pending official validation.`,
    })
    .where(eq(projects.id, draft.id));

  return { label: `project:submitted_for_review (${draft.title})`, created: true, skipped: false };
}

async function ensureMouStatus(status: (typeof engagementMous.$inferSelect)["status"]): Promise<SeedResult> {
  const existing = await seedDb
    .select({ id: engagementMous.id })
    .from(engagementMous)
    .where(eq(engagementMous.status, status))
    .limit(1);
  if (existing[0]) return { label: `mou:${status}`, created: false, skipped: true };

  const approvedEngagements = await seedDb
    .select({ id: investorEngagements.id, investorName: investorEngagements.investorName })
    .from(investorEngagements)
    .where(eq(investorEngagements.status, "approved"));

  for (const engagement of approvedEngagements) {
    const [mou] = await seedDb
      .select({ id: engagementMous.id, status: engagementMous.status })
      .from(engagementMous)
      .where(eq(engagementMous.engagementId, engagement.id))
      .limit(1);

    if (!mou || mou.status === "executed") continue;

    await seedDb.update(engagementMous).set({ status, updatedAt: new Date() }).where(eq(engagementMous.id, mou.id));
    return { label: `mou:${status} (${engagement.investorName})`, created: true, skipped: false };
  }

  return { label: `mou:${status}`, created: false, skipped: true };
}

async function ensureAccreditation(userId: string): Promise<SeedResult> {
  const existing = await seedDb.select({ id: accreditationDocuments.id }).from(accreditationDocuments).limit(1);
  if (existing[0]) return { label: "accreditation_documents", created: false, skipped: true };

  await seedDb.insert(accreditationDocuments).values({
    userId,
    kind: "commitment_letter",
    storageKey: `uat-demo/accreditation/${userId}-commitment.pdf`,
    fileName: "UAT Demo Commitment Letter.pdf",
    status: "pending",
  });

  return { label: "accreditation_documents", created: true, skipped: false };
}

async function ensureTeamAssignment(projectId: string, userId: string): Promise<SeedResult> {
  const existing = await seedDb.select({ id: projectTeamAssignments.id }).from(projectTeamAssignments).limit(1);
  if (existing[0]) return { label: "project_team_assignments", created: false, skipped: true };

  await seedDb.insert(projectTeamAssignments).values({
    projectId,
    userId,
    assignedBy: userId,
  });

  return { label: "project_team_assignments", created: true, skipped: false };
}

async function ensureAnnouncement(): Promise<SeedResult> {
  const existing = await seedDb.select({ id: announcements.id }).from(announcements).limit(1);
  if (existing[0]) return { label: "announcements", created: false, skipped: true };

  await seedDb.insert(announcements).values({
    title: "UAT Demo — Platform walkthrough",
    body: "Illustrative announcement for stakeholder testing. Pending official validation.",
    audienceRole: "all",
    status: "active",
  });

  return { label: "announcements", created: true, skipped: false };
}

async function ensureMarketingPopup(): Promise<SeedResult> {
  const existing = await seedDb.select({ id: marketingPopups.id }).from(marketingPopups).limit(1);
  if (existing[0]) return { label: "marketing_popups", created: false, skipped: true };

  await seedDb.insert(marketingPopups).values({
    title: "UAT Demo popup",
    body: "Illustrative marketing popup for stakeholder testing.",
    linkHref: "/platform",
    linkLabel: "Learn more",
    status: "active",
  });

  return { label: "marketing_popups", created: true, skipped: false };
}

async function ensureSiteContentBlock(): Promise<SeedResult> {
  const existing = await seedDb.select({ key: siteContentBlocks.key }).from(siteContentBlocks).limit(1);
  if (existing[0]) return { label: "site_content_blocks", created: false, skipped: true };

  await seedDb.insert(siteContentBlocks).values({
    key: "uat_demo_callout",
    body: {
      title: "UAT demo callout",
      body: "Illustrative CMS block for stakeholder testing.",
    },
  });

  return { label: "site_content_blocks", created: true, skipped: false };
}

async function ensureMouFieldComment(mouId: string, authorUserId: string): Promise<SeedResult> {
  const existing = await seedDb.select({ id: mouFieldComments.id }).from(mouFieldComments).limit(1);
  if (existing[0]) return { label: "mou_field_comments", created: false, skipped: true };

  await seedDb.insert(mouFieldComments).values({
    mouId,
    fieldKey: "indicativeCapital",
    authorUserId,
    authorName: "UAT Demo Reviewer",
    body: "Illustrative field comment for stakeholder testing.",
  });

  return { label: "mou_field_comments", created: true, skipped: false };
}

async function main() {
  const results: SeedResult[] = [];

  results.push(await ensureSubmittedProject());

  for (const status of ["in_review", "both_approved", "finalized", "ready_for_signature"] as const) {
    results.push(await ensureMouStatus(status));
  }

  const [qualifiedProfile] = await seedDb
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(eq(profiles.role, "qualified"))
    .limit(1);

  const qualifiedUserId = qualifiedProfile?.userId ?? null;

  if (qualifiedUserId) {
    results.push(await ensureAccreditation(qualifiedUserId));
  } else {
    results.push({ label: "accreditation_documents", created: false, skipped: true });
  }

  const [published] = await seedDb
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.projectStatus, "published"))
    .limit(1);

  if (qualifiedUserId && published) {
    results.push(await ensureTeamAssignment(published.id, qualifiedUserId));
  } else {
    results.push({ label: "project_team_assignments", created: false, skipped: true });
  }

  results.push(await ensureAnnouncement());
  results.push(await ensureMarketingPopup());
  results.push(await ensureSiteContentBlock());

  const [mou] = await seedDb.select({ id: engagementMous.id }).from(engagementMous).limit(1);
  if (mou && qualifiedUserId) {
    results.push(await ensureMouFieldComment(mou.id, qualifiedUserId));
  } else {
    results.push({ label: "mou_field_comments", created: false, skipped: true });
  }

  console.log(JSON.stringify({ marker: MARKER, results }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
