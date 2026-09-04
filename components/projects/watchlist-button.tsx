"use client";

import { Bookmark } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useWatchlist } from "@/lib/hooks/use-watchlist";
import { cn } from "@/lib/utils";

interface WatchlistButtonProps {
  projectId: string;
  dark?: boolean;
  /** Compact icon-only variant for dense contexts like ProjectCard; the detail page uses the
   *  labelled default. */
  compact?: boolean;
}

/**
 * Bookmark toggle for a single project (Investor Dashboard Expansion plan, Phase 2) — any
 * authenticated role can save projects to their `/deal-room/saved` watchlist. Renders nothing for
 * anonymous visitors rather than nudging sign-up here; the registration funnel is handled
 * elsewhere (RegisteredWelcomePanel, DealRoomAccessButton, etc.).
 */
export function WatchlistButton({ projectId, dark = false, compact = false }: WatchlistButtonProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { isSaved, toggle } = useWatchlist(isAuthenticated);

  if (isLoading || !isAuthenticated) return null;

  const saved = isSaved(projectId);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle(projectId);
      }}
      aria-pressed={saved}
      aria-label={saved ? "Remove from Saved Projects" : "Save to Saved Projects"}
      title={saved ? "Remove from Saved Projects" : "Save to Saved Projects"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors shrink-0",
        saved
          ? "border-[var(--color-gold)]/40 bg-[var(--color-gold)]/15 text-[var(--color-gold)]"
          : dark
            ? "border-white/20 text-white/80 hover:bg-white/10"
            : "border-zim-border text-zim-muted hover:bg-black/5"
      )}
    >
      <Bookmark className="h-3.5 w-3.5" fill={saved ? "currentColor" : "none"} />
      {!compact && (saved ? "Saved" : "Save")}
    </button>
  );
}
