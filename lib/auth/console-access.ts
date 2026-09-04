import type { AccountRole } from "@/lib/auth/types";

export type DashboardConsole = "admin" | "super-admin" | "deal-room" | "ministry";

export function consolesForRole(role: AccountRole | null): DashboardConsole[] {
  if (role === "super_admin") return ["super-admin", "admin", "deal-room"];
  if (role === "admin") return ["admin", "deal-room"];
  if (role === "government") return ["deal-room"];
  if (role === "ministry_admin") return ["ministry"];
  if (role === "qualified") return ["deal-room"];
  if (role === "registered") return ["deal-room"];
  return [];
}

export function isConsoleAllowedForRole(targetConsole: DashboardConsole, role: AccountRole | null): boolean {
  return consolesForRole(role).includes(targetConsole);
}

export function consoleFromPathname(pathname: string): DashboardConsole | null {
  if (pathname.startsWith("/super-admin")) return "super-admin";
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/deal-room")) return "deal-room";
  if (pathname.startsWith("/ministry")) return "ministry";
  return null;
}
