"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, ChevronsUpDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AccountRole } from "@/lib/auth/types";
import {
  CONSOLE_META,
  consolesForRole,
  getConsoleMeta,
  type DashboardConsole,
} from "@/components/dashboard/dashboard-nav-config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const CONSOLE_HOME_HREF: Record<DashboardConsole, string> = {
  admin: "/admin",
  "super-admin": "/super-admin",
  "deal-room": "/deal-room",
  ministry: "/ministry",
};

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface DashboardSidebarProps {
  console: DashboardConsole;
  role: AccountRole | null;
  authLoading?: boolean;
  onNavigate?: () => void;
  /** Desktop icon-rail mode (~64px). Ignored on the mobile Sheet, which is always expanded. */
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function DashboardSidebar({
  console: activeConsole,
  role,
  authLoading = false,
  onNavigate,
  collapsed = false,
  onToggleCollapse,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const meta = getConsoleMeta(activeConsole, role);
  const switchableConsoles = consolesForRole(role).filter((c) => c !== activeConsole);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full flex-col">
        <div
          className={cn("border-b", collapsed ? "px-2 py-4" : "px-4 py-5")}
          style={{ borderColor: "var(--color-sovereign-border)" }}
        >
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2 mb-4" onClick={onNavigate}>
              <span className="site-logo-overline">Republic of Zimbabwe</span>
            </Link>
          )}

          {collapsed ? (
            <div
              className="flex h-9 w-9 mx-auto items-center justify-center rounded-md text-sm font-bold text-white"
              style={{ backgroundColor: "rgba(0,100,0,0.3)", border: "1px solid var(--color-sovereign-border)" }}
              title={meta.label}
            >
              {meta.badge.slice(0, 1)}
            </div>
          ) : switchableConsoles.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-white/5"
                  style={{ border: "1px solid var(--color-sovereign-border)" }}
                >
                  <span>
                    <span className="block text-sm font-semibold text-white">{meta.label}</span>
                    <span className="block text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                      {meta.badge}
                    </span>
                  </span>
                  <ChevronsUpDown className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--color-text-muted)" }} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-56 border bg-[#0a140a] text-white"
                style={{ borderColor: "var(--color-sovereign-border)" }}
              >
                {[activeConsole, ...switchableConsoles].map((c) => (
                  <DropdownMenuItem key={c} asChild className="cursor-pointer focus:bg-white/10 focus:text-white">
                    <Link href={CONSOLE_HOME_HREF[c]}>
                      <span className={cn(c === activeConsole && "font-semibold text-white")}>
                        {CONSOLE_META[c].label}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div>
              <span className="block text-sm font-semibold text-white">{meta.label}</span>
              <span className="block text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                {meta.badge}
              </span>
            </div>
          )}
        </div>

        <nav className={cn("flex-1 overflow-y-auto py-4 space-y-1", collapsed ? "px-2" : "px-3")}>
          {authLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={cn("dashboard-skeleton h-9 rounded-md mb-1", collapsed ? "mx-1" : "")} />
              ))
            : meta.nav
            .filter((item) => !item.minRole || (role && item.minRole.includes(role)))
            .map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            const Icon = item.icon;
            const link = (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "dashboard-sidebar-link",
                  collapsed && "justify-center px-0",
                  active && "dashboard-sidebar-link-active"
                )}
                aria-label={item.label}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
            if (!collapsed) return link;
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <div className={cn("border-t py-3 space-y-1", collapsed ? "px-2" : "px-3")} style={{ borderColor: "var(--color-sovereign-border)" }}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/" onClick={onNavigate} className="dashboard-sidebar-link justify-center px-0" aria-label="View public site">
                  <Globe className="h-4 w-4 shrink-0" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">View public site</TooltipContent>
            </Tooltip>
          ) : (
            <Link href="/" onClick={onNavigate} className="dashboard-sidebar-link">
              <Globe className="h-4 w-4 shrink-0" />
              <span>View public site</span>
            </Link>
          )}

          {/* Collapse toggle — desktop only (the mobile Sheet passes no handler). */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className={cn("dashboard-sidebar-link w-full", collapsed && "justify-center px-0")}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronsRight className="h-4 w-4 shrink-0" />
              ) : (
                <>
                  <ChevronsLeft className="h-4 w-4 shrink-0" />
                  <span>Collapse</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
