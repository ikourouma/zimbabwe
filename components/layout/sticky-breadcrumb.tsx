"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { useProjectStore } from "@/context/project-store-context";
import { useTranslations } from "@/context/locale-context";

const ROUTE_PARENT: Record<string, { labelKey: "platform"; href: string }> = {
  "investor-journey": { labelKey: "platform", href: "/platform" },
  contact: { labelKey: "platform", href: "/platform" },
  projects: { labelKey: "platform", href: "/platform" },
  "admin": { labelKey: "platform", href: "/platform" },
  "super-admin": { labelKey: "platform", href: "/platform" },
  "deal-room": { labelKey: "platform", href: "/platform" },
};

interface Crumb {
  label: string;
  href: string;
}

export function StickyBreadcrumb() {
  const pathname = usePathname();
  const { sectors } = useTaxonomyStore();
  const { projects } = useProjectStore();
  const t = useTranslations();

  const routeLabels = t.breadcrumb as Record<string, string>;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const crumbs: Crumb[] = [];
  let href = "";

  const conceptualParent = ROUTE_PARENT[segments[0]];
  if (conceptualParent) {
    crumbs.push({ label: routeLabels.platform, href: conceptualParent.href });
  }

  segments.forEach((segment, index) => {
    href += `/${segment}`;
    const isLast = index === segments.length - 1;
    const parent = segments[index - 1];

    let label = routeLabels[segment];

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
          {t.breadcrumb.home}
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
