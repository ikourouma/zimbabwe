import { expect, test } from "@playwright/test";
import { DEMO_QUEUE_PROJECTS } from "../lib/db/seed/demo-accounts";
import { personaByKey, storageStatePath } from "./roles";

/**
 * Cross-ministry boundaries, asserted rather than assumed.
 *
 * The Ministry Official guide makes two claims that look contradictory unless both are shown to be
 * true at once: a ministry sees only its own pipeline, and a ministry can browse the national one.
 * Both hold, because the boundary is authority, not visibility — "My Ministry Only" narrows the
 * default view, and write access is refused outside the ministry regardless of what is on screen.
 *
 * The second test is the one that matters. A stakeholder asking "can Energy edit our project?"
 * deserves a better answer than "the list looks right", and this is the only check that produces
 * one. It expects a refusal, so it never mutates anything.
 */

const AGRICULTURE_PROJECT = DEMO_QUEUE_PROJECTS.find(
  (p) => p.ministryId === "min-agriculture" && p.status === "submitted_for_review",
);
if (!AGRICULTURE_PROJECT) throw new Error("Expected a seeded min-agriculture project to assert against");

/** Narrowing by status keeps the assertion off the far side of a paginated table. */
const QUEUE_URL = "/ministry/projects?status=submitted_for_review";

test.describe("Ministry Official — ICT", () => {
  test.use({ storageState: storageStatePath("ministry") });

  test("default pipeline excludes another ministry's project", async ({ page }) => {
    await page.goto(QUEUE_URL);

    // The toggle only renders for ministry_admin, so its presence confirms we are looking at a
    // scoped view rather than an admin's unscoped one.
    await expect(page.getByRole("button", { name: /My Ministry Only/ })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(AGRICULTURE_PROJECT.title)).toBeHidden();
  });

  test("cannot edit a project belonging to another ministry", async ({ page }) => {
    const list = await page.request.get("/api/projects");
    expect(list.ok()).toBeTruthy();
    const projects = (await list.json()) as { id: string; slug: string }[];
    const target = projects.find((p) => p.slug === AGRICULTURE_PROJECT.slug);

    // Skip rather than fail: a missing project means the seed has not run, which is a different
    // problem from a broken boundary and should not be reported as one.
    test.skip(!target, `${AGRICULTURE_PROJECT.slug} not present — run npm run seed:readiness -- --commit`);

    const res = await page.request.patch(`/api/projects/${target!.id}`, {
      data: { opportunitySummary: "cross-ministry write attempt" },
    });
    expect(res.status(), "an ICT official must not be able to write to an Agriculture project").toBe(403);
  });
});

test.describe("Ministry Official — Agriculture", () => {
  test.use({ storageState: storageStatePath("ministry-agriculture") });

  test("default pipeline includes its own project", async ({ page }) => {
    await page.goto(QUEUE_URL);

    await expect(page.getByRole("button", { name: /My Ministry Only/ })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(AGRICULTURE_PROJECT.title).first()).toBeVisible();
  });
});

test.describe("Government Reviewer — national scope", () => {
  test.use({ storageState: storageStatePath("government") });

  test("sees projects from more than one ministry", async ({ page }) => {
    const res = await page.request.get("/api/projects");
    expect(res.ok()).toBeTruthy();
    const projects = (await res.json()) as { slug: string; primaryBeneficiaryMinistryId?: string }[];

    const ministries = new Set(
      projects.map((p) => p.primaryBeneficiaryMinistryId).filter((m): m is string => Boolean(m)),
    );
    expect(ministries.size, "a national reviewer should see more than one ministry's projects").toBeGreaterThan(1);
  });
});

test.describe("Personas are the documented ones", () => {
  test("the guides and the specs use the same accounts", () => {
    // Cheap guard against the two drifting: the guides tell stakeholders to sign in as +demo, and
    // screenshots taken as +pilot would show a different set of data under the same instructions.
    for (const key of ["registered", "qualified", "government", "ministry", "admin", "superadmin"]) {
      expect(personaByKey(key).email, `${key} should be a +demo account`).toContain("+demo@");
    }
  });
});
