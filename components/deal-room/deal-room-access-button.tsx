"use client";

import Link from "next/link";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useTranslations } from "@/context/locale-context";

interface DealRoomAccessButtonProps {
  projectId: string;
}

/**
 * Entry point from the public project page into the Deal Room, for viewers who actually have
 * access to it — qualified investors (approved) plus ZIDA staff (admin/super_admin). Uses real
 * `useAuth()` (not the demo-persona toggle) so it reflects true entitlement, and deep-links into
 * the pipeline pre-focused on this project (see /deal-room/pipeline?projectId=). Renders nothing
 * for anyone without Deal Room access.
 */
export function DealRoomAccessButton({ projectId }: DealRoomAccessButtonProps) {
  const { isQualified, isAdmin, isSuperAdmin, isAuthenticated } = useAuth();
  const t = useTranslations();

  if (!isAuthenticated || !(isQualified || isAdmin || isSuperAdmin)) return null;

  return (
    <div
      className="rounded-lg border p-5"
      style={{ borderColor: "var(--color-sovereign-border)", backgroundColor: "rgba(255,255,255,0.02)" }}
    >
      <div className="flex items-start gap-3 mb-4">
        <LayoutDashboard className="h-5 w-5 shrink-0" style={{ color: "var(--color-gold)" }} />
        <div>
          <p className="text-sm font-medium text-white">{t.projectDetail.openInDealRoom}</p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
            {t.projectDetail.dataRoom}
          </p>
        </div>
      </div>
      <Link
        href={`/deal-room/pipeline?projectId=${projectId}`}
        className="btn-sovereign text-xs px-4 py-2 w-full justify-center"
      >
        {t.projectDetail.openInDealRoom} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
