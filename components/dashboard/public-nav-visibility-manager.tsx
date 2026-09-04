"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { useSiteSettings } from "@/context/site-settings-context";
import {
  PUBLIC_NAV_ADMIN_LABELS,
  PUBLIC_NAV_HREFS,
  type PublicNavHref,
} from "@/lib/governance/public-nav";

export function PublicNavVisibilityManager() {
  const { publicNavVisibility, setPublicNavVisibility, isLoading } = useSiteSettings();
  const [savingHref, setSavingHref] = useState<PublicNavHref | null>(null);

  const toggle = async (href: PublicNavHref) => {
    const next = { ...publicNavVisibility, [href]: !publicNavVisibility[href] };
    setSavingHref(href);
    try {
      await setPublicNavVisibility(next);
      toast.success(
        next[href]
          ? `${PUBLIC_NAV_ADMIN_LABELS[href]} is now visible in public nav`
          : `${PUBLIC_NAV_ADMIN_LABELS[href]} is hidden from public nav — the page stays reachable by URL`
      );
    } catch {
      toast.error("Failed to update nav visibility");
    } finally {
      setSavingHref(null);
    }
  };

  return (
    <section className="dashboard-panel p-5">
      <h2 className="text-sm font-semibold text-white mb-1">Public navigation visibility</h2>
      <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
        Hide a marketing-site header link without taking the page down. Hidden pages stay reachable by
        direct URL — this is a nav toggle, not an access or paywall control. Matching footer links are
        hidden too so the public site stays consistent.
      </p>
      <div className="space-y-2">
        {PUBLIC_NAV_HREFS.map((href) => {
          const visible = publicNavVisibility[href] !== false;
          return (
            <div
              key={href}
              className="flex items-center justify-between gap-3 rounded-md px-3 py-2"
              style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid var(--color-sovereign-border)" }}
            >
              <div>
                <p className="text-sm text-white">{PUBLIC_NAV_ADMIN_LABELS[href]}</p>
                <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                  {href}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={visible}
                disabled={isLoading || savingHref === href}
                onClick={() => toggle(href)}
                className="inline-flex items-center gap-2 text-xs font-medium disabled:opacity-60"
                style={{ color: visible ? "#86efac" : "var(--color-text-muted)" }}
              >
                {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {visible ? "Visible" : "Hidden"}
                <span
                  className="relative h-5 w-9 rounded-full transition-colors"
                  style={{ backgroundColor: visible ? "var(--color-zim-accent)" : "rgba(255,255,255,0.15)" }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform"
                    style={{ transform: visible ? "translateX(16px)" : "translateX(0)" }}
                  />
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
