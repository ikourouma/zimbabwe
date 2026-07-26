"use client";

import { AccountView } from "@/components/account/account-view";

/**
 * Canonical, role-agnostic Account & Security page. Reachable from the avatar menu for every
 * authenticated role and from each console's Settings/Account nav entry. Renders in the standard
 * dark chrome (body[data-shell="dark"]); AccountView itself guards unauthenticated access.
 */
export default function AccountPage() {
  return (
    <main className="min-h-[70vh] px-6 py-10 md:px-10">
      <div className="mx-auto w-full max-w-5xl">
        <AccountView />
      </div>
    </main>
  );
}
