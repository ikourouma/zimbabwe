"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useSiteSettings } from "@/context/site-settings-context";
import { getRequiredLevelForField, type AccessLevel } from "@/lib/entitlements/visibility";
import { AccessGate } from "@/components/dashboard/access-gate";
import { AnnouncementsManager } from "@/components/dashboard/announcements-manager";
import { MarketingCmsManager } from "@/components/dashboard/marketing-cms-manager";
import type { BannerDisplayMode } from "@/context/site-settings-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCESS_LEVEL_ORDER: AccessLevel[] = ["public", "registered", "qualified", "admin"];
const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  public: "Public",
  registered: "Registered",
  qualified: "Qualified",
  admin: "Admin",
};

function levelMeets(level: AccessLevel, required: AccessLevel) {
  return ACCESS_LEVEL_ORDER.indexOf(level) >= ACCESS_LEVEL_ORDER.indexOf(required);
}

interface FieldVisibilityRow {
  label: string;
  requiredLevel: AccessLevel;
  interactive?: "cost-structure";
}

const FIELD_VISIBILITY_ROWS: FieldVisibilityRow[] = [
  { label: "Title, Sector & Location", requiredLevel: getRequiredLevelForField("title") },
  { label: "Opportunity Summary", requiredLevel: getRequiredLevelForField("opportunitySummary") },
  { label: "Cost Structure", requiredLevel: getRequiredLevelForField("capitalRequired"), interactive: "cost-structure" },
  { label: "Description & Scope", requiredLevel: getRequiredLevelForField("description") },
  { label: "Financial Indicators (IRR / NPV / ROI)", requiredLevel: getRequiredLevelForField("irr") },
  { label: "Documents & Investor Pack", requiredLevel: getRequiredLevelForField("documents") },
  { label: "Data Verification Status", requiredLevel: getRequiredLevelForField("dataVerificationStatus") },
];

export default function SuperAdminSettingsPage() {
  const { isSuperAdmin, isLoading: authLoading } = useAuth();
  const {
    costStructureHidden,
    setCostStructureHidden,
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

  const [banner, setBanner] = useState({
    enabled: flashBannerEnabled,
    message: flashBannerMessage ?? "",
    ctaLabel: flashBannerCtaLabel ?? "",
    ctaHref: flashBannerCtaHref ?? "",
  });
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (hydrated || isLoading) return;
    setBanner({
      enabled: flashBannerEnabled,
      message: flashBannerMessage ?? "",
      ctaLabel: flashBannerCtaLabel ?? "",
      ctaHref: flashBannerCtaHref ?? "",
    });
    setHydrated(true);
  }, [hydrated, isLoading, flashBannerEnabled, flashBannerMessage, flashBannerCtaLabel, flashBannerCtaHref]);

  const handleSaveBanner = async () => {
    setSaving(true);
    try {
      await updateFlashBanner({
        flashBannerEnabled: banner.enabled,
        flashBannerMessage: banner.message || null,
        flashBannerCtaLabel: banner.ctaLabel || null,
        flashBannerCtaHref: banner.ctaHref || null,
      });
      toast.success("Flash banner updated");
    } catch {
      toast.error("Failed to update flash banner");
    } finally {
      setSaving(false);
    }
  };

  if (!authLoading && !isSuperAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Use a super admin pilot account to manage tenant and site-wide settings."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Site Settings</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Tenant configuration, the sitewide flash banner, and entitlement kill switches.
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

      <AnnouncementsManager />

      <MarketingCmsManager />

      <section className="dashboard-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Flash Banner (legacy)</h2>
          <label className="flex items-center gap-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
            <input
              type="checkbox"
              checked={banner.enabled}
              onChange={(e) => setBanner({ ...banner, enabled: e.target.checked })}
              className="h-3.5 w-3.5"
            />
            Enabled sitewide
          </label>
        </div>
        <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
          Shown above the header on every page when enabled. Leave the CTA fields blank to show a message with no
          link.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-text-muted)" }}>Message</label>
            <textarea
              value={banner.message}
              onChange={(e) => setBanner({ ...banner, message: e.target.value })}
              rows={2}
              className="dashboard-input"
              placeholder="e.g. Demo showcase — seeded data pending official validation."
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-text-muted)" }}>CTA Label</label>
              <input
                value={banner.ctaLabel}
                onChange={(e) => setBanner({ ...banner, ctaLabel: e.target.value })}
                className="dashboard-input"
                placeholder="Learn more"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-text-muted)" }}>CTA Link</label>
              <input
                value={banner.ctaHref}
                onChange={(e) => setBanner({ ...banner, ctaHref: e.target.value })}
                className="dashboard-input"
                placeholder="/platform"
              />
            </div>
          </div>
          <Button onClick={handleSaveBanner} disabled={saving || isLoading}>
            {saving ? "Saving…" : "Save Flash Banner"}
          </Button>
        </div>
      </section>

      <section className="dashboard-panel p-5">
        <h2 className="text-sm font-semibold text-white mb-1">Field Visibility Matrix</h2>
        <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
          Reference view of entitlement rules by field group. Cost Structure has a live sitewide kill switch — every
          other row reflects the platform&apos;s existing, non-editable access rules.
        </p>
        <div className="overflow-x-auto">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Field Group</th>
                {ACCESS_LEVEL_ORDER.map((level) => (
                  <th key={level} className="text-center">{ACCESS_LEVEL_LABELS[level]}</th>
                ))}
                <th className="text-right">Sitewide Control</th>
              </tr>
            </thead>
            <tbody>
              {FIELD_VISIBILITY_ROWS.map((row) => {
                const isCostStructure = row.interactive === "cost-structure";
                const rowHidden = isCostStructure && costStructureHidden;
                return (
                  <tr key={row.label}>
                    <td className="font-medium text-white">
                      {row.label}
                      {rowHidden && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(255,211,0,0.15)", color: "#fde047" }}>
                          Hidden sitewide
                        </span>
                      )}
                    </td>
                    {ACCESS_LEVEL_ORDER.map((level) => {
                      const meets = levelMeets(level, row.requiredLevel) && !rowHidden;
                      return (
                        <td key={level} className="text-center">
                          {meets ? (
                            <Check className="h-4 w-4 inline" style={{ color: "#4ade80" }} />
                          ) : (
                            <X className={cn("h-4 w-4 inline")} style={{ color: "var(--color-text-muted)", opacity: 0.5 }} />
                          )}
                        </td>
                      );
                    })}
                    <td className="text-right">
                      {isCostStructure ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                            {costStructureHidden ? "Hidden" : "Visible"}
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={!costStructureHidden}
                            onClick={() => {
                              setCostStructureHidden(!costStructureHidden);
                              toast.success(costStructureHidden ? "Cost Structure shown sitewide" : "Cost Structure hidden sitewide");
                            }}
                            className="relative h-5 w-9 rounded-full transition-colors"
                            style={{ backgroundColor: costStructureHidden ? "rgba(255,255,255,0.15)" : "var(--color-zim-accent)" }}
                          >
                            <span
                              className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform"
                              style={{ transform: costStructureHidden ? "translateX(0)" : "translateX(16px)" }}
                            />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Fixed rule</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
