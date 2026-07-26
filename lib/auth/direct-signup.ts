import { randomBytes } from "node:crypto";

/** Generates a strong, URL-safe temporary password for direct account provisioning (super-admin
 *  "Create User"). Shown to the operator exactly once — never persisted in plaintext. */
export function generateTempPassword(): string {
  return randomBytes(12).toString("base64url");
}

/**
 * Creates a Neon Auth (managed Better Auth) account directly via the sign-up/email endpoint,
 * bypassing the normal self-service flow's email-verification step (disabled platform-wide for
 * the pilot — see lib/auth/server.ts). This is the same call `lib/db/seed/accounts.ts` uses to
 * provision pilot accounts, extracted so it can also run from a live API route
 * (POST /api/users/create) for the super-admin "Create User" feature.
 *
 * Throws with a message safe to surface to the operator (never leaks upstream response bodies
 * that might contain internal auth-service details).
 */
export async function createAuthUserDirect(
  email: string,
  password: string,
  name: string
): Promise<{ userId: string }> {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  if (!baseUrl || baseUrl.includes("unset-neon-auth")) {
    throw new Error("Direct account creation is not configured in this environment.");
  }
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const response = await fetch(`${baseUrl}/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ email, password, name, callbackURL: `${origin}/` }),
  });

  if (response.ok) {
    const data = (await response.json().catch(() => ({}))) as { user?: { id: string } };
    if (data.user?.id) return { userId: data.user.id };
    throw new Error("Account creation succeeded but no user id was returned.");
  }

  if (response.status === 422 || response.status === 409) {
    throw new Error("An account with this email already exists.");
  }

  throw new Error(`Could not create the account (auth service returned ${response.status}).`);
}
