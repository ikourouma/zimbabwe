import { Resend } from "resend";

/**
 * Low-level Resend wrapper (Team Ministry Traceability Batch, Phase 8 — "notification hooks") —
 * the platform's first real outbound-email call site. Deliberately defensive: every call site in
 * this codebase treats notification email as fire-and-forget "nice to have", never a hard
 * dependency of the request it's attached to, so failures here are logged and swallowed rather
 * than thrown. Returns `false` (never throws) if `RESEND_API_KEY` isn't configured — lets every
 * local/dev environment run the full feature set without a real Resend account.
 */
let client: Resend | null = null;
function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? "ZIDA Investment Platform <notifications@zidaproject.com>";

export async function sendEmail(input: { to: string; subject: string; html: string }): Promise<boolean> {
  const resend = getClient();
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not configured — skipped "${input.subject}" to ${input.to}`);
    return false;
  }
  try {
    const { error } = await resend.emails.send({ from: FROM_ADDRESS, to: input.to, subject: input.subject, html: input.html });
    if (error) {
      console.error(`[email] Resend rejected "${input.subject}" to ${input.to}:`, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[email] failed to send "${input.subject}" to ${input.to}:`, err);
    return false;
  }
}

/** Shared, minimal HTML shell so every notification email has one consistent look without a
 *  full templating system — sufficient for the plain, factual copy these hooks send. */
export function emailShell(bodyHtml: string): string {
  return `<div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
    <p style="font-size: 12px; letter-spacing: 0.05em; text-transform: uppercase; color: #6b7280; margin-bottom: 16px;">ZIDA Investment Platform</p>
    ${bodyHtml}
    <p style="font-size: 12px; color: #9ca3af; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 12px;">
      You're receiving this because of your notification preferences. Manage them anytime from My Profile → Account &amp; Security.
    </p>
  </div>`;
}
