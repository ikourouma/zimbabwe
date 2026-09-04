"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft, ArrowUp, ArrowDown } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import {
  CONSOLE_META,
  consolesForRole,
  getConsoleMeta,
  type DashboardConsole,
  type DashboardNavItem,
} from "@/components/dashboard/dashboard-nav-config";

interface PaletteEntry extends DashboardNavItem {
  console: DashboardConsole;
}

/** Lightweight Cmd+K / Ctrl+K command palette for cross-console navigation (Phase 5 stretch goal).
 *  Deliberately built on the existing Dialog-free custom overlay instead of pulling in `cmdk`,
 *  since this is explicitly a "time permitting" extra, not a committed dependency addition. */
export function CommandPaletteTrigger() {
  const router = useRouter();
  const { role } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const entries = useMemo<PaletteEntry[]>(() => {
    const consoles = consolesForRole(role);
    return consoles.flatMap((console) =>
      CONSOLE_META[console].nav
        .filter((item) => !item.minRole || (role && item.minRole.includes(role)))
        .map((item) => ({ ...item, console }))
    );
  }, [role]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) => e.label.toLowerCase().includes(q) || getConsoleMeta(e.console, role).label.toLowerCase().includes(q)
    );
  }, [entries, query, role]);

  useEffect(() => setActiveIndex(0), [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const navigate = (entry: PaletteEntry) => {
    router.push(entry.href);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const entry = filtered[activeIndex];
      if (entry) navigate(entry);
    }
  };

  if (entries.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors hover:bg-white/10"
        style={{ border: "1px solid var(--color-sovereign-border)", color: "var(--color-text-muted)" }}
        aria-label="Open command palette"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search</span>
        <kbd className="ml-1 px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
          ⌘K
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="sm:hidden p-2 rounded-full hover:bg-white/10 transition-colors"
        aria-label="Open command palette"
      >
        <Search className="h-4.5 w-4.5" style={{ color: "var(--color-text-secondary)" }} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] px-4"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-lg shadow-2xl overflow-hidden"
            style={{ backgroundColor: "var(--color-sovereign-panel)", border: "1px solid var(--color-sovereign-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--color-sovereign-border)" }}>
              <Search className="h-4 w-4" style={{ color: "var(--color-text-muted)" }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Jump to a page…"
                className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-zim-muted"
              />
            </div>
            <div className="max-h-80 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                  No matching pages.
                </p>
              ) : (
                filtered.map((entry, i) => {
                  const Icon = entry.icon;
                  return (
                    <button
                      key={`${entry.console}-${entry.href}`}
                      type="button"
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => navigate(entry)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors"
                      style={{
                        backgroundColor: i === activeIndex ? "rgba(255,255,255,0.08)" : "transparent",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      <Icon className="h-4 w-4 shrink-0" style={{ color: "var(--color-text-muted)" }} />
                      <span className="text-white">{entry.label}</span>
                      <span className="ml-auto text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {getConsoleMeta(entry.console, role).label}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            <div
              className="flex items-center gap-4 px-4 py-2 text-[10px]"
              style={{ borderTop: "1px solid var(--color-sovereign-border)", color: "var(--color-text-muted)" }}
            >
              <span className="inline-flex items-center gap-1">
                <ArrowUp className="h-3 w-3" /> <ArrowDown className="h-3 w-3" /> navigate
              </span>
              <span className="inline-flex items-center gap-1">
                <CornerDownLeft className="h-3 w-3" /> select
              </span>
              <span className="ml-auto">esc to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
