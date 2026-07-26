"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useDemoPersona } from "@/context/demo-persona-context";
import { useTranslations } from "@/context/locale-context";

/**
 * Shared CTA row for "Full Blueprint Access" style callouts (strategic-alignment pillar
 * panel, sector detail page). `/deal-room-demo` has no page-level access control of its own —
 * it's an internal kanban prototype, kept out of public nav and reachable only via the
 * admin-gated Deal Room capability drawer. This mirrors that same gate here so an unregistered
 * or non-admin visitor can never click straight into it; they only ever see "Request qualified access".
 */
export function WorkspaceAccessCta({ className = "flex flex-wrap gap-3" }: { className?: string }) {
  const { isAdmin } = useDemoPersona();
  const t = useTranslations();
  const pd = t.projectDetail;

  return (
    <div className={className}>
      {isAdmin && (
        <Link href="/deal-room" className="btn-sovereign text-xs px-4 py-2 whitespace-nowrap">
          {pd.signInToWorkspace} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
      <Link href="/strategic-partnerships" className="btn-sovereign-ghost text-xs px-4 py-2 whitespace-nowrap">
        {pd.requestQualifiedAccess}
      </Link>
    </div>
  );
}
