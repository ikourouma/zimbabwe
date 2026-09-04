"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { useSiteSettings } from "@/context/site-settings-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { EntitlementMatrixManager } from "@/components/dashboard/entitlement-matrix-manager";
import { AnnouncementsManager } from "@/components/dashboard/announcements-manager";
import { MarketingCmsManager } from "@/components/dashboard/marketing-cms-manager";
import { MarketingPopupsManager } from "@/components/dashboard/marketing-popups-manager";
import { PublicNavVisibilityManager } from "@/components/dashboard/public-nav-visibility-manager";
import type { BannerDisplayMode } from "@/context/site-settings-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function SuperAdminSettingsPage() {
  const { isSuperAdmin, isLoading: authLoading } = useAuth();
  const {
    flashBannerEnabled,
    flashBannerMessage,
    flashBannerCtaLabel,
    flashBannerCtaHref,
    updateFlashBanner,
    bannerDisplayMode,
    setBannerDisplayMode,
    isLoading,
  } = useSiteSettings();
  const [savingDisplayMode, setSavingDisplayMode] = useState(false);

  const handleDisplayModeChange = async (mode: BannerDisplayMode) => {
    setSavingDisplayMode(true);
    try {
      await setBannerDisplayMode(mode);
      toast.success(mode === "rotate" ? "Banners will now auto-rotate one at a time" : "Banners will now stack");
    } catch {
      toast.error("Failed to update banner display mode");
    } finally {
      setSavingDisplayMode(false);
    }
  };

  const [saving, setSaving] = useState(false);

  if (!authLoading && !isSuperAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Sign in with a super admin account to manage tenant and site-wide settings."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Site Settings</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Tenant configuration, public nav visibility, marketing popups, announcements, and entitlement kill switches.
        </p>
      </div>

      <section className="dashboard-panel p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Country / Tenant</h2>
        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Tenant</p>
            <p style={{ color: "var(--color-text-secondary)" }}>Zimbabwe / ZIDA</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Platform Owner</p>
            <p style={{ color: "var(--color-text-secondary)" }}>Afronovation</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Default Visibility</p>
            <p style={{ color: "var(--color-text-secondary)" }}>Public (high-level), Registered (details)</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Governance Mode</p>
            <p style={{ color: "var(--color-text-secondary)" }}>Review required before publish</p>
          </div>
        </div>
      </section>

      <section className="dashboard-panel p-5">
        <h2 className="text-sm font-semibold text-white mb-1">Banner Display Mode</h2>
        <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
          When more than one announcement is active at once, choose whether every banner stacks (all shown at
          once) or the header rotates through them one at a time.
        </p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: "stack" as const, label: "Stack all active banners" },
              { value: "rotate" as const, label: "Auto-rotate one at a time" },
            ]
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={savingDisplayMode || isLoading}
              onClick={() => handleDisplayModeChange(opt.value)}
              className={cn(
                "rounded-md border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-60",
                bannerDisplayMode === opt.value
                  ? "border-[var(--color-gold)] bg-[var(--color-gold)]/15 text-white"
                  : "border-[var(--color-sovereign-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-gold)]/50"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <PublicNavVisibilityManager />

      <MarketingPopupsManager />

      <AnnouncementsManager />

      <MarketingCmsManager />

      <section className="dashboard-panel p-5">
        <h2 className="text-sm font-semibold text-white mb-1">Flash Banner (do not use)</h2>
        <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
          Retired. Use Announcements above for public-site messaging. This singleton banner is kept only so an
          already-enabled message can be turned off.
        </p>
        {flashBannerEnabled ? (
          <Button
            size="sm"
            variant="outline"
            disabled={saving || isLoading}
            onClick={async () => {
              setSaving(true);
              try {
                await updateFlashBanner({
                  flashBannerEnabled: false,
                  flashBannerMessage: flashBannerMessage,
                  flashBannerCtaLabel: flashBannerCtaLabel,
                  flashBannerCtaHref: flashBannerCtaHref,
                });
                toast.success("Legacy flash banner disabled");
              } catch {
                toast.error("Failed to disable flash banner");
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Disabling…" : "Disable legacy flash banner"}
          </Button>
        ) : (
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Currently off.
          </p>
        )}
      </section>

      <EntitlementMatrixManager />
    </div>
  );
}
