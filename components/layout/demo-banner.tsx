"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useSiteSettings } from "@/context/site-settings-context";
import { useAuth } from "@/context/auth-context";
import { useAnnouncements, matchesAudience } from "@/lib/hooks/use-announcements";
import type { Announcement, AnnouncementStyle } from "@/lib/types";

interface DemoBannerProps {
  variant: "light" | "dark";
}

const DISMISS_PREFIX = "announcement-dismissed-";

const STYLE_DARK: Record<AnnouncementStyle, { bg: string; border: string; color: string }> = {
  info: { bg: "rgba(255,211,0,0.08)", border: "rgba(255,211,0,0.25)", color: "var(--color-text-secondary)" },
  success: { bg: "rgba(74,222,128,0.10)", border: "rgba(74,222,128,0.30)", color: "#bbf7d0" },
  warning: { bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.30)", color: "#fde68a" },
  critical: { bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.35)", color: "#fecaca" },
};

const STYLE_LIGHT: Record<AnnouncementStyle, string> = {
  info: "bg-zim-gold/15 border-zim-gold/30 text-zim-charcoal",
  success: "bg-green-100 border-green-300 text-green-900",
  warning: "bg-amber-100 border-amber-300 text-amber-900",
  critical: "bg-red-100 border-red-300 text-red-900",
};

function BannerRow({
  variant,
  style,
  message,
  ctaLabel,
  ctaHref,
  onDismiss,
}: {
  variant: "light" | "dark";
  style: AnnouncementStyle;
  message: React.ReactNode;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  onDismiss?: () => void;
}) {
  const showCta = ctaLabel && ctaHref;
  const inner = (
    <>
      {message}
      {showCta && (
        <Link
          href={ctaHref!}
          className="ml-2 font-medium underline"
          style={variant === "dark" ? { color: "var(--color-gold)" } : undefined}
        >
          {ctaLabel}
        </Link>
      )}
    </>
  );

  if (variant === "dark") {
    const s = STYLE_DARK[style];
    return (
      <div
        className="relative px-4 py-2 text-center text-sm"
        style={{ backgroundColor: s.bg, borderBottom: `1px solid ${s.border}`, color: s.color }}
      >
        {inner}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss announcement"
            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`relative border-b px-4 py-2 text-center text-sm ${STYLE_LIGHT[style]}`}>
      {inner}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss announcement"
          className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/**
 * Sitewide banner stack. Renders super-admin-managed announcements (Super Admin → Site Settings →
 * Announcements) filtered by the viewer's role and active schedule window, sorted by priority, with
 * per-banner localStorage dismissal. The legacy singleton flash banner is still rendered underneath
 * for back-compat with existing configured messages.
 */
const ROTATE_INTERVAL_MS = 6000;

export function DemoBanner({ variant }: DemoBannerProps) {
  const {
    flashBannerEnabled,
    flashBannerMessage,
    flashBannerCtaLabel,
    flashBannerCtaHref,
    bannerDisplayMode,
    isLoading,
  } = useSiteSettings();
  const { role } = useAuth();
  const { announcements } = useAnnouncements();
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const [rotateIndex, setRotateIndex] = useState(0);

  useEffect(() => {
    const map: Record<string, boolean> = {};
    for (const a of announcements) {
      if (localStorage.getItem(`${DISMISS_PREFIX}${a.id}`)) map[a.id] = true;
    }
    setDismissed(map);
  }, [announcements]);

  const visible = useMemo(
    () => announcements.filter((a) => matchesAudience(a.audienceRole, role) && !dismissed[a.id]),
    [announcements, role, dismissed]
  );

  const dismiss = (a: Announcement) => {
    localStorage.setItem(`${DISMISS_PREFIX}${a.id}`, "1");
    setDismissed((prev) => ({ ...prev, [a.id]: true }));
  };

  const showLegacy = !isLoading && flashBannerEnabled && flashBannerMessage;

  // Slots = every visible announcement plus the legacy flash banner (if enabled), in that order —
  // "rotate" mode cycles through them one at a time instead of stacking all of them at once.
  const slots = useMemo(
    () => [
      ...visible.map((a) => ({ kind: "announcement" as const, announcement: a })),
      ...(showLegacy ? [{ kind: "legacy" as const, announcement: null }] : []),
    ],
    [visible, showLegacy]
  );

  const rotating = bannerDisplayMode === "rotate" && slots.length > 1;

  useEffect(() => {
    if (!rotating) {
      setRotateIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setRotateIndex((i) => (i + 1) % slots.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [rotating, slots.length]);

  if (slots.length === 0) return null;

  const renderSlot = (slot: (typeof slots)[number]) => {
    if (slot.kind === "legacy") {
      return (
        <BannerRow
          key="legacy"
          variant={variant}
          style="info"
          message={flashBannerMessage}
          ctaLabel={flashBannerCtaLabel}
          ctaHref={flashBannerCtaHref}
        />
      );
    }
    const a = slot.announcement!;
    return (
      <BannerRow
        key={a.id}
        variant={variant}
        style={a.style}
        message={
          <>
            {a.title ? <span className="font-medium">{a.title}: </span> : null}
            {a.body}
          </>
        }
        ctaLabel={a.ctaLabel}
        ctaHref={a.ctaHref}
        onDismiss={a.dismissable ? () => dismiss(a) : undefined}
      />
    );
  };

  if (bannerDisplayMode === "rotate" && slots.length > 0) {
    const active = slots[rotateIndex % slots.length];
    return (
      <div className="relative">
        {renderSlot(active)}
        {slots.length > 1 && (
          <div className="absolute bottom-0.5 left-1/2 flex -translate-x-1/2 gap-1 pb-0.5">
            {slots.map((_, i) => (
              <span
                key={i}
                className="h-1 w-1 rounded-full transition-opacity"
                style={{
                  backgroundColor: variant === "dark" ? "var(--color-gold)" : "currentColor",
                  opacity: i === rotateIndex % slots.length ? 0.9 : 0.3,
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return <>{slots.map(renderSlot)}</>;
}
