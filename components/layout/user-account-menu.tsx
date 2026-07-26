"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, UserCog } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useAuthTransition } from "@/context/auth-transition-context";
import { useTranslations } from "@/context/locale-context";
import { authClient } from "@/lib/auth/client";
import type { AccountRole } from "@/lib/auth/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type MenuLink = { href: string; label: string };

function getInitials(name: string | null, email: string | null): string {
  const source = (name ?? email ?? "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function getRoleLabel(role: AccountRole | null, roles: Record<string, string>): string {
  if (!role) return roles.registered;
  return roles[role] ?? roles.registered;
}

function getMenuLinks(
  role: AccountRole | null,
  links: {
    projectRegistry: string;
    investorJourney: string;
    strategicInquiries: string;
    dealRoom: string;
    adminConsole: string;
    superAdmin: string;
  },
): MenuLink[] {
  switch (role) {
    case "super_admin":
      return [
        { href: "/super-admin", label: links.superAdmin },
        { href: "/admin", label: links.adminConsole },
        { href: "/projects", label: links.projectRegistry },
      ];
    case "admin":
      return [
        { href: "/admin", label: links.adminConsole },
        { href: "/projects", label: links.projectRegistry },
      ];
    case "qualified":
    case "government":
      return [
        { href: "/deal-room", label: links.dealRoom },
        { href: "/projects", label: links.projectRegistry },
        { href: "/strategic-partnerships", label: links.strategicInquiries },
      ];
    default:
      return [
        { href: "/projects", label: links.projectRegistry },
        { href: "/investor-journey", label: links.investorJourney },
        { href: "/strategic-partnerships", label: links.strategicInquiries },
      ];
  }
}

interface UserAccountMenuProps {
  variant?: "header" | "mobile";
  onNavigate?: () => void;
}

export function UserAccountMenu({ variant = "header", onNavigate }: UserAccountMenuProps) {
  const router = useRouter();
  const { email, name, role, isLoading, isAuthenticated, refresh } = useAuth();
  const { runSignOutTransition } = useAuthTransition();
  const t = useTranslations();
  const am = t.accountMenu;

  if (isLoading) {
    return (
      <div
        className="hidden sm:block h-9 w-24 rounded-full animate-pulse"
        style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
        aria-hidden="true"
      />
    );
  }

  if (!isAuthenticated) return null;

  const initials = getInitials(name, email);
  const roleLabel = getRoleLabel(role, am.roles);
  const menuLinks = getMenuLinks(role, am.links);

  const handleSignOut = async () => {
    await runSignOutTransition(async () => {
      await authClient.signOut();
      await refresh();
      router.push("/");
      router.refresh();
    });
    onNavigate?.();
  };

  if (variant === "mobile") {
    return (
      <div className="mb-4 pb-4 border-b" style={{ borderColor: "var(--color-sovereign-border)" }}>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold"
            style={{ backgroundColor: "var(--color-zim-green)", color: "#fff" }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{name ?? email}</p>
            <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
              {email}
            </p>
            <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: "var(--color-gold)" }}>
              {roleLabel}
            </p>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {menuLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="nav-item block"
              onClick={onNavigate}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/account" className="nav-item block" onClick={onNavigate}>
            <span className="inline-flex items-center gap-2">
              <UserCog className="h-3.5 w-3.5" />
              {am.accountSettings}
            </span>
          </Link>
          <button
            type="button"
            className="nav-item block w-full text-left mt-2"
            style={{ color: "#f87171" }}
            onClick={() => void handleSignOut()}
          >
            <span className="inline-flex items-center gap-2">
              <LogOut className="h-3.5 w-3.5" />
              {am.signOut}
            </span>
          </button>
        </nav>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="hidden sm:inline-flex items-center gap-2 rounded-full pl-1 pr-2 py-1 transition-colors hover:bg-white/10"
          aria-label={am.openMenu}
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shrink-0"
            style={{ backgroundColor: "var(--color-zim-green)", color: "#fff" }}
          >
            {initials}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-white/70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 border bg-[#0a140a] text-white"
        style={{ borderColor: "var(--color-sovereign-border)" }}
      >
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium truncate">{name ?? email}</p>
          <p className="text-xs truncate font-normal" style={{ color: "var(--color-text-muted)" }}>
            {email}
          </p>
          <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: "var(--color-gold)" }}>
            {roleLabel}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        {menuLinks.map((link) => (
          <DropdownMenuItem key={link.href} asChild className="cursor-pointer focus:bg-white/10 focus:text-white">
            <Link href={link.href}>{link.label}</Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem asChild className="cursor-pointer focus:bg-white/10 focus:text-white">
          <Link href="/account">
            <UserCog className="h-4 w-4 mr-2" />
            {am.accountSettings}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-300"
          onClick={() => void handleSignOut()}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {am.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
