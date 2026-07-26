"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus } from "lucide-react";
import { UserAccountMenu } from "@/components/layout/user-account-menu";
import { CONSOLE_META, type DashboardConsole } from "@/components/dashboard/dashboard-nav-config";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { CommandPaletteTrigger } from "@/components/dashboard/command-palette";

interface DashboardTopbarProps {
  console: DashboardConsole;
  onMenuClick: () => void;
}

export function DashboardTopbar({ console: activeConsole, onMenuClick }: DashboardTopbarProps) {
  const pathname = usePathname();
  const meta = CONSOLE_META[activeConsole];
  const currentItem = meta.nav.find((item) => (item.exact ? pathname === item.href : pathname.startsWith(item.href)));
  // Project creation is an Admin/Super-Admin capability — surfaced as a persistent quick action so
  // staff can spin up a project from anywhere in those consoles (deep-links to ?new=1).
  const createHref =
    activeConsole === "super-admin"
      ? "/super-admin/projects?new=1"
      : activeConsole === "admin"
        ? "/admin/projects?new=1"
        : null;

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
