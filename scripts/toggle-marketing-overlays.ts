/**
 * Turns the public marketing overlays on or off.
 *
 * The seeded "UAT Demo popup" and "UAT Demo — Platform walkthrough" announcement are illustrative
 * test content, and they sit on top of every public marketing page. That is fine while the pilot is
 * being exercised and wrong for a stakeholder deliverable: the screenshots in the Public Visitor
 * guide were captured with the modal covering the page underneath it.
 *
 * Overlays are not booleans in this schema — `status` is one of active / draft / archived, and only
 * `active` (inside its start/end window) is served. Turning one "off" therefore means moving it to
 * `draft`, which is exactly what the Status control in Platform Settings does, and it preserves the
 * record so it can be switched back.
 *
 *   npm run overlays:off   before a screenshot run or a demo
 *   npm run overlays:on    to restore whatever was switched off
 *
 * Only rows this script moved are restored, tracked by writing the previous status into a marker
 * file, so `--on` cannot accidentally publish a draft somebody was still writing.
 */
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { eq, inArray } from "drizzle-orm";
import { announcements, marketingPopups } from "@/lib/db/schema";
import { seedDb, seedPool } from "../lib/db/seed/db";

const MARKER = "scripts/.overlays-suspended.json";

type Suspended = { popups: string[]; announcements: string[] };

async function turnOff() {
  const activePopups = await seedDb
    .select({ id: marketingPopups.id, title: marketingPopups.title })
    .from(marketingPopups)
    .where(eq(marketingPopups.status, "active"));

  const activeAnnouncements = await seedDb
    .select({ id: announcements.id, title: announcements.title })
    .from(announcements)
    .where(eq(announcements.status, "active"));

  if (activePopups.length === 0 && activeAnnouncements.length === 0) {
    console.log("Nothing active — no overlays to switch off.");
    return;
  }

  for (const p of activePopups) console.log(`  popup        "${p.title}"  active -> draft`);
  for (const a of activeAnnouncements) console.log(`  announcement "${a.title}"  active -> draft`);

  if (activePopups.length) {
    await seedDb
      .update(marketingPopups)
      .set({ status: "draft", updatedAt: new Date() })
      .where(inArray(marketingPopups.id, activePopups.map((p) => p.id)));
  }
  if (activeAnnouncements.length) {
    await seedDb
      .update(announcements)
      .set({ status: "draft", updatedAt: new Date() })
      .where(inArray(announcements.id, activeAnnouncements.map((a) => a.id)));
  }

  const suspended: Suspended = {
    popups: activePopups.map((p) => p.id),
    announcements: activeAnnouncements.map((a) => a.id),
  };
  writeFileSync(MARKER, JSON.stringify(suspended, null, 2));
  console.log(`\nSwitched off ${activePopups.length + activeAnnouncements.length}. Restore with: npm run overlays:on`);
}

async function turnOn() {
  if (!existsSync(MARKER)) {
    console.log("No record of anything this script switched off. Nothing to restore.");
    return;
  }

  const suspended = JSON.parse(readFileSync(MARKER, "utf8")) as Suspended;

  if (suspended.popups.length) {
    await seedDb
      .update(marketingPopups)
      .set({ status: "active", updatedAt: new Date() })
      .where(inArray(marketingPopups.id, suspended.popups));
  }
  if (suspended.announcements.length) {
    await seedDb
      .update(announcements)
      .set({ status: "active", updatedAt: new Date() })
      .where(inArray(announcements.id, suspended.announcements));
  }

  unlinkSync(MARKER);
  console.log(
    `Restored ${suspended.popups.length} popup(s) and ${suspended.announcements.length} announcement(s) to active.`
  );
}

async function main() {
  const mode = process.argv[2];
  if (mode !== "--off" && mode !== "--on") {
    console.error("Usage: toggle-marketing-overlays.ts --off | --on");
    process.exitCode = 1;
    return;
  }

  if (mode === "--off") await turnOff();
  else await turnOn();

  await seedPool.end();
}

void main();
