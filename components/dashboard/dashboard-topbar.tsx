"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus } from "lucide-react";
import { UserAccountMenu } from "@/components/layout/user-account-menu";
import { getConsoleMeta, type DashboardConsole } from "@/components/dashboard/dashboard-nav-config";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { CommandPaletteTrigger } from "@/components/dashboard/command-palette";
import { useAuth } from "@/context/auth-context";

interface DashboardTopbarProps {
  console: DashboardConsole;
  onMenuClick: () => void;
}

export function DashboardTopbar({ console: activeConsole, onMenuClick }: DashboardTopbarProps) {
  const pathname = usePathname();
  const { role } = useAuth();
  const meta = getConsoleMeta(activeConsole, role);
  const currentItem = meta.nav.find((item) => (item.exact ? pathname === item.href : pathname.startsWith(item.href)));
  // Project creation is an Admin/Super-Admin capability, plus (Team Ministry Traceability Batch,
  // Phase 3, item 8) ministry_admin for their own ministry — surfaced as a persistent quick action
  // so staff can spin up a project from anywhere in those consoles. Links straight to the real
  // full-page wizard route (Platform Feedback Batch v3, Phase 5) rather than a `?new=1` deep link
  // into a Dialog — a genuine route navigation has no "must reload to reopen" failure mode to work
  // around in the first place.
  const createBasePath =
    activeConsole === "super-admin"
      ? "/super-admin/projects"
      : activeConsole === "admin"
        ? "/admin/projects"
        : activeConsole === "ministry"
          ? "/ministry/projects"
          : null;
  const createHref = createBasePath ? `${createBasePath}/new` : null;

  return (
    <header className="dashboard-topbar sticky top-0 z-30 flex items-center gap-3 px-4 sm:px-6 h-14 shrink-0">
      <button
        type="button"
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded hover:bg-white/10 transition-colors"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5 text-white" />
      </button>

      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
          {meta.label}
        </p>
        <p className="text-sm font-semibold text-white truncate">{currentItem?.label ?? "Overview"}</p>
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
        {createHref && (
          <Link
            href={createHref}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-[var(--color-gold)] px-3 py-1.5 text-xs font-semibold text-black hover:brightness-95 transition"
            title="Create a new project (Ctrl/Cmd+N on the Projects page)"
          >
            <Plus className="h-3.5 w-3.5" /> Create Project
          </Link>
        )}
        <CommandPaletteTrigger />
        <NotificationBell />
        <UserAccountMenu />
      </div>
    </header>
  );
}
