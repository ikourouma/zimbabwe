"use client";

import Link from "next/link";
import type { SDG } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const SIZE_CLASSES: Record<"sm" | "md" | "lg", string> = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-7 w-7 text-[10px]",
  lg: "h-9 w-9 text-sm",
};

interface SdgBadgeProps {
  sdg: SDG;
  size?: "sm" | "md" | "lg";
  /** Ring/opacity treatment for use as a filter toggle. Only meaningful with `onClick`. */
  active?: boolean;
  onClick?: () => void;
  /** Renders as a Next Link instead of a button/span. */
  href?: string;
  className?: string;
}

/** Small colored SDG number badge with an accessible Radix tooltip showing the full goal name —
 *  the single shared render for every SDG badge across the platform (project cards, filters,
 *  detail pages, admin forms). Renders as a Link, button, or plain span depending on props. */
export function SdgBadge({ sdg, size = "md", active, onClick, href, className }: SdgBadgeProps) {
  const badgeClassName = cn(
    "flex shrink-0 items-center justify-center rounded-full font-bold text-white transition-all",
    SIZE_CLASSES[size],
    onClick && (active ? "ring-2 ring-offset-2 ring-zim-charcoal" : "opacity-80 hover:opacity-100"),
    className
  );
  const style = { backgroundColor: sdg.colorToken };
  const label = `SDG ${sdg.number}: ${sdg.name}`;

  let trigger: React.ReactNode;
  if (href) {
    trigger = (
      <Link href={href} aria-label={label} className={badgeClassName} style={style}>
        {sdg.number}
      </Link>
    );
  } else if (onClick) {
    trigger = (
      <button type="button" onClick={onClick} aria-label={label} className={badgeClassName} style={style}>
        {sdg.number}
      </button>
    );
  } else {
    trigger = (
      <span aria-label={label} className={badgeClassName} style={style}>
        {sdg.number}
      </span>
    );
  }

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
