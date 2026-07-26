"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { consoleFromPathname } from "@/components/dashboard/dashboard-nav-config";
import { NdaGate } from "@/components/deal-room/nda-gate";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "zimbabwe.dashboard.sidebarCollapsed";

interface DashboardShellProps {
  pathname: string;
  children: React.ReactNode;
}

export function DashboardShell({ pathname, children }: DashboardShellProps) {
  const { role } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const activeConsole = consoleFromPathname(pathname);

  // Persist the collapse-to-icon-rail preference (Jira/Notion/Monday pattern) — read once on
  // mount to avoid an SSR/client hydration mismatch on the initial paint.
  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  };

  if (!activeConsole) return <>{children}</>;

  return (
    <div className="dashboard-shell flex h-screen overflow-hidden">
      <aside
        className={cn(
          "dashboard-sidebar hidden lg:flex lg:flex-shrink-0 transition-[width] duration-200",
          collapsed ? "lg:w-16" : "lg:w-64"
        )}
      >
        <DashboardSidebar
          console={activeConsole}
          role={role}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
        />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 dashboard-sidebar">
          <DashboardSidebar console={activeConsole} role={role} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardTopbar console={activeConsole} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 py-6 max-w-[1400px]">
            {activeConsole === "deal-room" ? <NdaGate>{children}</NdaGate> : children}
          </div>
        </main>
      </div>
    </div>
  );
}
