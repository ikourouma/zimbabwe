import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { DEFAULT_NOTIFICATION_PREFERENCES, type NotificationPreferences } from "@/lib/types";
import { emailShell, sendEmail } from "@/lib/email/send";

/**
 * User-scoped notification dispatch — the one place every "notify a person when something
 * changes their responsibilities" hook in this batch goes through (Phase 8). Looks up the
 * recipient's own email + saved `notificationPrefs` fresh (never trusts a possibly-stale actor
 * context passed in from elsewhere), gates on the matching preference key, then hands off to
 * the low-level `sendEmail`. Always fire-and-forget from the caller's perspective — call sites
 * should `void notifyUser(...)`, never `await` it inline in a mutation's critical path.
 */
export async function notifyUser(input: {
  userId: string;
  prefKey: keyof NotificationPreferences;
  subject: string;
  bodyHtml: string;
}): Promise<void> {
  try {
    const rows = await db.execute<{ email: string; notification_prefs: NotificationPreferences | null }>(
      sql`SELECT u.email, p.notification_prefs
          FROM neon_auth."user" u
          LEFT JOIN profiles p ON p.user_id = u.id::text
          WHERE u.id = ${input.userId}
          LIMIT 1`
    );
    const row = rows.rows[0];
    if (!row) return;

    const prefs: NotificationPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(row.notification_prefs ?? {}) };
    if (!prefs[input.prefKey]) return;

    await sendEmail({ to: row.email, subject: input.subject, html: emailShell(input.bodyHtml) });
  } catch (err) {
    console.error(`[email] notifyUser failed for ${input.userId}:`, err);
  }
}
