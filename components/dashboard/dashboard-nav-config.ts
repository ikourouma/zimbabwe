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
  Bookmark,
  FilePlus2,
  UserSquare2,
  FileSignature,
  FileArchive,
} from "lucide-react";
import type { AccountRole } from "@/lib/auth/types";

export type { DashboardConsole } from "@/lib/auth/console-access";
export { consolesForRole, isConsoleAllowedForRole, consoleFromPathname } from "@/lib/auth/console-access";
import type { DashboardConsole } from "@/lib/auth/console-access";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Exact match only (e.g. the console's own overview route) — otherwise prefix match. */
  exact?: boolean;
  /** Restricts this item to a subset of roles within the console (Investor Dashboard Expansion
   *  plan) — e.g. Engagements/Communication Hub/My Proposals stay qualified-only even though the
   *  Deal Room console itself is now open to `registered` too. Omit for "everyone in this
   *  console can see it." */
  minRole?: AccountRole[];
}

/** Deal Room items gated to qualified/government/admin/super_admin — a `registered` investor
 *  sees the rest of the console (Overview, Pipeline, Saved Projects, Activity Report, Account)
 *  but not these until they qualify. */
const QUALIFIED_AND_UP: AccountRole[] = ["qualified", "government", "admin", "super_admin"];

// Org-team invites are owner-scoped to qualified investors only (government has no org to invite
// teammates into, and no server-side invite rights) — Team stays off QUALIFIED_AND_UP's broader
// list to avoid showing a nav item that 403s for government (Platform Feedback Batch v3, Phase 1).
const TEAM_ROLES: AccountRole[] = ["qualified"];

export const ADMIN_NAV: DashboardNavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/review", label: "Review Queue", icon: ClipboardCheck },
  { href: "/admin/inquiries", label: "Inquiries", icon: Inbox },
  { href: "/admin/mou", label: "MOU Registry", icon: FileSignature },
  { href: "/admin/users", label: "Users & Roles", icon: Users },
  { href: "/admin/reports", label: "Reports", icon: FileBarChart },
  // ZIDA/gov staff reply to investor questions from their own console — one shared
  // CommunicationHubView, role-scoped content (see app/admin/communication/page.tsx).
  { href: "/admin/communication", label: "Communication Hub", icon: MessagesSquare },
  { href: "/admin/profile", label: "My Profile", icon: UserSquare2 },
  { href: "/admin/account", label: "Account", icon: UserCog },
];

export const SUPER_ADMIN_NAV: DashboardNavItem[] = [
  { href: "/super-admin", label: "Analytics", icon: BarChart3, exact: true },
  { href: "/super-admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/super-admin/review", label: "Review Queue", icon: ClipboardCheck },
  { href: "/super-admin/users", label: "Users & Roles", icon: Users },
  { href: "/super-admin/inquiries", label: "Inquiries", icon: Inbox },
  { href: "/super-admin/mou", label: "MOU Registry", icon: FileSignature },
  { href: "/super-admin/reports", label: "Reports", icon: FileBarChart },
  { href: "/super-admin/taxonomies", label: "Taxonomies", icon: Tags },
  { href: "/super-admin/communication", label: "Communication Hub", icon: MessagesSquare },
  { href: "/super-admin/settings", label: "Site Settings", icon: Settings },
  { href: "/super-admin/audit", label: "Audit Log", icon: ScrollText },
  { href: "/super-admin/override", label: "Publishing Override", icon: ShieldCheck },
  { href: "/super-admin/profile", label: "My Profile", icon: UserSquare2 },
  { href: "/super-admin/account", label: "Account", icon: UserCog },
];

export const DEAL_ROOM_NAV: DashboardNavItem[] = [
  { href: "/deal-room", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/deal-room/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/deal-room/saved", label: "Saved Projects", icon: Bookmark },
  { href: "/deal-room/proposals", label: "My Proposals", icon: FilePlus2, minRole: QUALIFIED_AND_UP },
  { href: "/deal-room/engagements", label: "Engagements", icon: Handshake, minRole: QUALIFIED_AND_UP },
  { href: "/deal-room/mou", label: "MOU Registry", icon: FileSignature, minRole: QUALIFIED_AND_UP },
  { href: "/deal-room/vault", label: "Document Vault", icon: FileArchive },
  // Dedicated Teams page (Team Ministry Traceability Batch, Phase 4, item 3) — bulk invite +
  // full roster + assignment overview, promoted out of the My Profile page's small panel.
  { href: "/deal-room/teams", label: "Team", icon: Users, minRole: TEAM_ROLES },
  { href: "/deal-room/communication", label: "Communication Hub", icon: MessagesSquare, minRole: QUALIFIED_AND_UP },
  { href: "/deal-room/reports", label: "My Activity Report", icon: FileBarChart },
  { href: "/deal-room/profile", label: "My Profile", icon: UserSquare2 },
  { href: "/deal-room/settings", label: "Account", icon: UserCog },
];

// Ministry Admin's own console (Deal Room Feedback Batch v2, Phase 6) — deliberately its own
// small console rather than being bolted onto /admin: a ministry official gets console-admin-like
// authority over their ministry's own pipeline (full create/edit/publish rights on their own
// ministry's projects as of Phase 3), but never the platform-wide user/taxonomy/site governance
// powers /admin carries. "Team" reuses the same org-team invite pipeline qualified investors use,
// now on its own dedicated page like the Deal Room's (Phase 4) rather than buried in My Profile.
export const MINISTRY_NAV: DashboardNavItem[] = [
  { href: "/ministry", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/ministry/projects", label: "Ministry Pipeline", icon: FolderKanban },
  // Dedicated Review Queue (Platform Feedback Batch v4, Phase 8) — ministry-scoped submissions
  // plus government-filed amendment requests awaiting this ministry_admin's stage-1 decision.
  { href: "/ministry/review", label: "Review Queue", icon: ClipboardCheck },
  // Read-only oversight into investor engagements on the ministry's own projects (Subject Dropdown
  // + Ministry Engagements plan, Part B) — creation/status changes stay with the investor/ZIDA.
  { href: "/ministry/engagements", label: "Engagements", icon: Handshake },
  { href: "/ministry/mou", label: "MOU Registry", icon: FileSignature },
  { href: "/ministry/inquiries", label: "Inquiries", icon: Inbox },
  { href: "/ministry/communication", label: "Communication Hub", icon: MessagesSquare },
  // Scoped, direct "Create User" capability (Platform Feedback Batch v3, Phase 1) — distinct from
  // "Team" below: this mints real government-role ministry staff accounts instantly, force-locked
  // to this ministry_admin's own ministryId, mirroring /admin/users's CreateUserModal.
  { href: "/ministry/users", label: "Users & Roles", icon: UserCog },
  { href: "/ministry/teams", label: "Team", icon: Users },
  { href: "/ministry/reports", label: "Reports", icon: FileBarChart },
  { href: "/ministry/profile", label: "My Profile", icon: UserSquare2 },
  { href: "/ministry/account", label: "Account", icon: UserCog },
];

export const CONSOLE_META: Record<DashboardConsole, { label: string; nav: DashboardNavItem[]; badge: string }> = {
  admin: { label: "Admin Console", nav: ADMIN_NAV, badge: "ZIDA Admin" },
  "super-admin": { label: "Platform Admin", nav: SUPER_ADMIN_NAV, badge: "Platform Ops" },
  // Relabeled from "Deal Room" (Investor Dashboard Expansion plan) — the /deal-room URL and
  // internal naming (NdaGate, DealRoomAccessGate, etc.) stay as-is to avoid a large rename, but
  // this is now the one home console for every registered + qualified investor, not just deals.
  "deal-room": { label: "Investor Dashboard", nav: DEAL_ROOM_NAV, badge: "Investor Workspace" },
  ministry: { label: "Ministry Desk", nav: MINISTRY_NAV, badge: "Ministry Official" },
};

/**
 * Role-aware console label/badge (Team Ministry Traceability Batch, Phase 6, item 7) — a
 * `government` reviewer shares the `"deal-room"` console/nav with actual investors (same
 * Overview/Pipeline/Engagements/etc. routes), but calling it "Investor Dashboard" in their own UI
 * is a labeling bug, not a deliberate choice: they're a platform-wide reviewer, not an investor.
 * `registered`/`qualified` (and every other console) keep the plain `CONSOLE_META` copy unchanged.
 */
export function getConsoleMeta(console: DashboardConsole, role: AccountRole | null) {
  const base = CONSOLE_META[console];
  if (console === "deal-room" && role === "government") {
    return { ...base, label: "Government Reviewer Console", badge: "Government Reviewer" };
  }
  return base;
}
