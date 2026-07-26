import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardCheck,
  Inbox,
  BarChart3,
  Users,
  Tags,
  Settings,
  ScrollText,
  ShieldCheck,
  KanbanSquare,
  Handshake,
  MessagesSquare,
  UserCog,
  FileBarChart,
} from "lucide-react";
import type { AccountRole } from "@/lib/auth/types";

export type DashboardConsole = "admin" | "super-admin" | "deal-room";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Exact match only (e.g. the console's own overview route) — otherwise prefix match. */
  exact?: boolean;
}

export const ADMIN_NAV: DashboardNavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/review", label: "Review Queue", icon: ClipboardCheck },
  { href: "/admin/inquiries", label: "Inquiries", icon: Inbox },
  { href: "/admin/users", label: "Users & Roles", icon: Users },
  { href: "/admin/reports", label: "Reports", icon: FileBarChart },
  // ZIDA/gov staff reply to investor questions from their own console — one shared
  // CommunicationHubView, role-scoped content (see app/admin/communication/page.tsx).
  { href: "/admin/communication", label: "Communication Hub", icon: MessagesSquare },
  { href: "/admin/account", label: "Account", icon: UserCog },
];

export const SUPER_ADMIN_NAV: DashboardNavItem[] = [
  { href: "/super-admin", label: "Analytics", icon: BarChart3, exact: true },
  { href: "/super-admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/super-admin/users", label: "Users & Roles", icon: Users },
  { href: "/super-admin/inquiries", label: "Inquiries", icon: Inbox },
  { href: "/super-admin/reports", label: "Reports", icon: FileBarChart },
  { href: "/super-admin/taxonomies", label: "Taxonomies", icon: Tags },
  { href: "/super-admin/communication", label: "Communication Hub", icon: MessagesSquare },
  { href: "/super-admin/settings", label: "Site Settings", icon: Settings },
  { href: "/super-admin/audit", label: "Audit Log", icon: ScrollText },
  { href: "/super-admin/override", label: "Publishing Override", icon: ShieldCheck },
  { href: "/super-admin/account", label: "Account", icon: UserCog },
];

export const DEAL_ROOM_NAV: DashboardNavItem[] = [
  { href: "/deal-room", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/deal-room/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/deal-room/engagements", label: "Engagements", icon: Handshake },
  { href: "/deal-room/communication", label: "Communication Hub", icon: MessagesSquare },
  { href: "/deal-room/reports", label: "My Activity Report", icon: FileBarChart },
  { href: "/deal-room/settings", label: "Account", icon: UserCog },
];

export const CONSOLE_META: Record<DashboardConsole, { label: string; nav: DashboardNavItem[]; badge: string }> = {
  admin: { label: "Admin Console", nav: ADMIN_NAV, badge: "ZIDA Admin" },
  "super-admin": { label: "Platform Admin", nav: SUPER_ADMIN_NAV, badge: "Platform Ops" },
  "deal-room": { label: "Deal Room", nav: DEAL_ROOM_NAV, badge: "Investor Workspace" },
};

/** Console switcher — super_admin can jump between all three without leaving the app shell. */
export function consolesForRole(role: AccountRole | null): DashboardConsole[] {
  if (role === "super_admin") return ["super-admin", "admin", "deal-room"];
  if (role === "admin") return ["admin", "deal-room"];
  if (role === "government") return ["deal-room"];
  if (role === "qualified") return ["deal-room"];
  return [];
}

export function consoleFromPathname(pathname: string): DashboardConsole | null {
  if (pathname.startsWith("/super-admin")) return "super-admin";
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/deal-room")) return "deal-room";
  return null;
}
