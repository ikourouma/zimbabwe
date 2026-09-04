"use client";

import { useAuth } from "@/context/auth-context";
import { useSiteSettings } from "@/context/site-settings-context";
import { accessLevelForRole, isQualifiedTier } from "@/lib/entitlements/visibility";
import { parseCapitalBreakdown } from "@/lib/utils/capital";
import { cn } from "@/lib/utils";

interface CapitalBreakdownProps {
  value?: string;
  dark?: boolean;
  /** Cap the number of visible line items (e.g. in a compact card). Omit to show all. */
  maxItems?: number;
  className?: string;
  /** Heading rendered above the list — owned by this component so heading + list hide/show as one unit. */
  label?: string;
}

export function CapitalBreakdown({ value, dark = false, maxItems, className, label }: CapitalBreakdownProps) {
  const { role } = useAuth();
  const { costStructureHidden } = useSiteSettings();
  const items = parseCapitalBreakdown(value);
  const accessLevel = accessLevelForRole(role);

  if (items.length === 0) return null;
  // Itemized dollar breakdown is qualified-only by fixed product policy (see isQualifiedTier),
  // independent of the configurable financialsE1 matrix row that governs the public headline
  // capitalRequired string. costStructureHidden remains a sitewide kill switch above that.
  if (costStructureHidden && accessLevel !== "admin") return null;
  if (!isQualifiedTier(accessLevel)) return null;

  const visible = maxItems ? items.slice(0, maxItems) : items;
  const hiddenCount = items.length - visible.length;

  return (
    <div className={className}>
      {label && (
        <p
          className={cn(
            "text-[0.65rem] uppercase tracking-widest font-semibold mb-1.5",
            dark ? "text-[var(--color-text-muted)]" : "text-zim-muted"
          )}
        >
          {label}
        </p>
      )}
      <ul className="space-y-1">
        {visible.map((item) => (
          <li
            key={item.label}
            className={cn("flex items-baseline gap-1.5 text-xs leading-relaxed", dark ? "text-white/90" : "text-zim-charcoal")}
          >
            <span aria-hidden="true" className={dark ? "text-white/30" : "text-zim-border"}>
              •
            </span>
            <span className="font-semibold tabular-nums">{item.amount}</span>
            <span className={dark ? "text-[var(--color-text-muted)]" : "text-zim-muted"}>{item.label}</span>
          </li>
        ))}
        {hiddenCount > 0 && (
          <li className={cn("pl-3 text-xs", dark ? "text-[var(--color-text-muted)]" : "text-zim-muted")}>
            +{hiddenCount} more component{hiddenCount > 1 ? "s" : ""}
          </li>
        )}
      </ul>
      <p className={cn("mt-1.5 text-[0.65rem] italic", dark ? "text-[var(--color-text-muted)]" : "text-zim-muted")}>
        Estimated figures — subject to change based on feasibility and resource availability.
      </p>
    </div>
  );
}
