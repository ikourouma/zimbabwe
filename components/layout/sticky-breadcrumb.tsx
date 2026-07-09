"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { useProjectStore } from "@/context/project-store-context";

const ROUTE_LABELS: Record<string, string> = {
  opportunity: "Opportunity",
  platform: "Platform Concept",
  "strategic-alignment": "Strategic Pillars",
  sectors: "Priority Sectors",
  projects: "Project Registry",
  "about-afronovation": "Afronovation",
  "investor-journey": "Investor Journey",
  zimbabwe: "Zimbabwe",
  contact: "Contact",
  legal: "Legal",
  "admin-demo": "Admin Demo",
  "super-admin-demo": "Super Admin Demo",
  "deal-room-demo": "Deal Room (Demo)",
};

/**
 * Conceptual parent for top-level routes that are surfaced as capability cards on
 * /platform, so their breadcrumb reflects Home -> Platform Concept -> [page] even
 * though the URL itself is flat (not nested under /platform/...).
 */
const ROUTE_PARENT: Record<string, { label: string; href: string }> = {
  "investor-journey": { label: "Platform Concept", href: "/platform" },
  contact: { label: "Platform Concept", href: "/platform" },
  projects: { label: "Platform Concept", href: "/platform" },
  "admin-demo": { label: "Platform Concept", href: "/platform" },
  "super-admin-demo": { label: "Platform Concept", href: "/platform" },
  "deal-room-demo": { label: "Platform Concept", href: "/platform" },
};

interface Crumb {
  label: string;
  href: string;
}

export function StickyBreadcrumb() {
  const pathname = usePathname();
  const { sectors } = useTaxonomyStore();
  const { projects } = useProjectStore();

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const crumbs: Crumb[] = [];
  let href = "";

  const conceptualParent = ROUTE_PARENT[segments[0]];
  if (conceptualParent) {
    crumbs.push({ label: conceptualParent.label, href: conceptualParent.href });
  }

  segments.forEach((segment, index) => {
    href += `/${segment}`;
    const isLast = index === segments.length - 1;
    const parent = segments[index - 1];

    let label = ROUTE_LABELS[segment];

    if (!label && parent === "sectors") {
      label = sectors.find((s) => s.slug === segment)?.name ?? segment;
    } else if (!label && parent === "projects") {
      label = projects.find((p) => p.slug === segment)?.title ?? segment;
    } else if (!label) {
      label = segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }

    crumbs.push({ label, href: isLast ? "" : href });
  });

  return (
    <nav
      aria-label="Breadcrumb"
      className="sticky top-16 lg:top-20 z-30 border-b"
      style={{
        backgroundColor: "var(--color-nav-bg)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      <div className="page-container flex items-center gap-1.5 py-2.5 text-xs overflow-x-auto whitespace-nowrap">
        <Link
          href="/"
          className="transition-colors hover:text-white"
          style={{ color: "var(--color-text-muted)" }}
        >
          Home
        </Link>
        {crumbs.map((crumb) => (
          <span key={crumb.href || crumb.label} className="flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3 shrink-0" style={{ color: "var(--color-text-muted)" }} />
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="transition-colors hover:text-white"
                style={{ color: "var(--color-text-muted)" }}
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="text-white font-medium">{crumb.label}</span>
            )}
          </span>
        ))}
      </div>
    </nav>
  );
}
