"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/system/page-container";

interface DeepDiveShellProps {
  children: React.ReactNode;
  overline?: string;
  title?: string;
  backHref?: string;
  backLabel?: string;
  /** Set to false when full-bleed sections follow this shell (e.g. reused homepage sections) so
   *  the intro doesn't force a full viewport of empty space before they start. Defaults to true
   *  to keep every existing usage unaffected. */
  minHeightScreen?: boolean;
}

export function DeepDiveShell({
  children,
  overline,
  title,
  backHref = "/",
  backLabel = "Return to Platform",
  minHeightScreen = true,
}: DeepDiveShellProps) {
  return (
    <div className={minHeightScreen ? "min-h-screen" : ""} style={{ backgroundColor: "var(--color-sovereign-midnight)" }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,100,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,100,0,0.04) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
        aria-hidden="true"
      />
      <PageContainer className="relative pt-28 pb-16">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm mb-8 transition-colors hover:text-white"
          style={{ color: "var(--color-text-muted)" }}
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        {(overline || title) && (
          <div className="mb-12">
            {overline && <p className="section-overline mb-3">{overline}</p>}
            {title && (
              <h1
                className="font-light text-white"
                style={{
                  fontSize: "var(--type-display-size)",
                  letterSpacing: "var(--type-display-tracking)",
                  lineHeight: "var(--type-display-leading)",
                }}
              >
                {title}
              </h1>
            )}
          </div>
        )}
        {children}
      </PageContainer>
    </div>
  );
}
