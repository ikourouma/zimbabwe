"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Pencil,
  Send,
  Eye,
  CheckCircle,
  Rocket,
  EyeOff,
  KanbanSquare,
  Landmark,
  FileCheck,
  ShieldCheck,
} from "lucide-react";
import { useDemoPersona } from "@/context/demo-persona-context";
import { useProjectStore } from "@/context/project-store-context";
import { useSiteStats } from "@/lib/hooks/use-site-stats";
import { getInReviewCount } from "@/lib/governance/project-workflow";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";

interface CapabilityDrawerShellProps {
  trigger: ReactNode;
  overline: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

function CapabilityDrawerShell({ trigger, overline, title, description, children, footer }: CapabilityDrawerShellProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent>
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: "linear-gradient(90deg, var(--color-gold), var(--color-zim-green))" }}
          aria-hidden="true"
        />

        <SheetHeader>
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-1.5"
            style={{ color: "var(--color-gold)" }}
          >
            {overline}
          </p>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {children}
        </div>

        <div className="mt-8 pt-6 border-t" style={{ borderColor: "var(--color-sovereign-border)" }}>
          {footer}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Shows a real link into the internal console only if the visitor has switched the demo
 *  persona to a role that would actually have access — otherwise a hint pointing at the
 *  persona switcher, so the drawer never routes a public visitor into a staff tool. */
function PersonaGatedConsoleLink({
  requiredPersona,
  consoleHref,
  consoleLabel,
}: {
  requiredPersona: "admin" | "super_admin";
  consoleHref: string;
  consoleLabel: string;
}) {
  const { isAdmin, isSuperAdmin } = useDemoPersona();
  const unlocked = requiredPersona === "admin" ? isAdmin : isSuperAdmin;

  if (unlocked) {
    return (
      <Link
        href={consoleHref}
        className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:text-white"
        style={{ color: "var(--color-gold)" }}
      >
        {consoleLabel} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    );
  }

  return (
    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
      Switch to the {requiredPersona === "admin" ? "Admin or Super Admin" : "Super Admin"} persona
      (top right) to preview this console.
    </p>
  );
}

/** Callout used by both drawers for the single most compelling point — visually distinct from
 *  the surrounding explanatory prose so it doesn't read as one more bullet in a list. */
function HighlightCallout({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div
      className="flex gap-3 rounded-lg p-4"
      style={{ backgroundColor: "rgba(255,211,0,0.06)", border: "1px solid rgba(255,211,0,0.2)" }}
    >
      <Icon className="h-5 w-5 shrink-0" style={{ color: "var(--color-gold)" }} />
      <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>
        {children}
      </p>
    </div>
  );
}

function TimelineNode({ icon: Icon, label, isLast }: { icon: LucideIcon; label: string; isLast?: boolean }) {
  return (
    <div className="relative flex gap-4 pb-6 last:pb-0">
      {!isLast && (
        <span
          className="absolute left-[15px] top-8 bottom-0 w-px"
          style={{ backgroundColor: "var(--color-sovereign-border)" }}
          aria-hidden="true"
        />
      )}
      <div
        className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: "rgba(255,211,0,0.12)", border: "1px solid var(--color-gold)" }}
      >
        <Icon className="h-4 w-4" style={{ color: "var(--color-gold)" }} />
      </div>
      <p className="pt-1.5 text-sm font-medium text-white">{label}</p>
    </div>
  );
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="rounded-lg p-4 text-center"
      style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid var(--color-sovereign-border)" }}
    >
      <p className="font-light leading-none" style={{ fontSize: "1.5rem", color: "var(--color-gold)" }}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-widest mt-1" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </p>
    </div>
  );
}

function FeatureRow({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: "rgba(255,211,0,0.1)" }}
      >
        <Icon className="h-4 w-4" style={{ color: "var(--color-gold)" }} />
      </div>
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
          {description}
        </p>
      </div>
    </div>
  );
}

export function GovernanceWorkflowDrawer({ trigger }: { trigger: ReactNode }) {
  return (
    <CapabilityDrawerShell
      trigger={trigger}
      overline="How It Works"
      title="Governance Workflow"
      description="Every project moves through a staff-managed review pipeline before it ever reaches an investor — this is enforced in the data model, not just the UI."
      footer={
        <PersonaGatedConsoleLink
          requiredPersona="admin"
          consoleHref="/admin-demo"
          consoleLabel="Open Review Console"
        />
      }
    >
      <div>
        <TimelineNode icon={Pencil} label="Draft" />
        <TimelineNode icon={Send} label="Submitted for Review" />
        <TimelineNode icon={Eye} label="Under Review" />
        <TimelineNode icon={CheckCircle} label="Approved" />
        <TimelineNode icon={Rocket} label="Published" isLast />
      </div>

      <p>
        A reviewer can send a submission back with <strong style={{ color: "var(--color-text-primary)" }}>Changes Requested</strong>,
        looping it back to the project owner for resubmission — and a published project can later
        be moved to <strong style={{ color: "var(--color-text-primary)" }}>Archived</strong> without deleting its record.
      </p>

      <HighlightCallout icon={CheckCircle}>
        <strong>Why it matters:</strong> every project an investor sees on the registry passed through
        this exact pipeline — nothing reaches the public catalogue unreviewed.
      </HighlightCallout>
    </CapabilityDrawerShell>
  );
}

export function AdminTaxonomiesDrawer({ trigger }: { trigger: ReactNode }) {
  const stats = useSiteStats();

  return (
    <CapabilityDrawerShell
      trigger={trigger}
      overline="How It Works"
      title="Admin-Managed Taxonomies"
      description="The structures that organize the registry are configured centrally, not hard-coded — so the platform's shape can evolve without a code change or a redeploy."
      footer={
        <PersonaGatedConsoleLink
          requiredPersona="super_admin"
          consoleHref="/super-admin-demo"
          consoleLabel="Open Super Admin Console"
        />
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile value={stats.sectorCount} label="Sectors" />
        <StatTile value={stats.pillarCount} label="Pillars" />
        <StatTile value={stats.ministryCount} label="Ministries" />
        <StatTile value={stats.provinceCount} label="Provinces" />
      </div>

      <p>
        Ministries have full add / edit / remove management, just like Provinces — every project&apos;s
        beneficiary ministry alignment updates instantly platform-wide when a super admin changes this
        registry. SDGs follow the same centrally-configured pattern. This is the same underlying
        mechanism that would let the platform&apos;s structure be reconfigured for a different country&apos;s
        ministries, provinces, or sectors.
      </p>

      <HighlightCallout icon={EyeOff}>
        <strong>Field Visibility Matrix</strong> — a super admin can hide or show sensitive fields,
        like Cost Structure, platform-wide, instantly.
      </HighlightCallout>
    </CapabilityDrawerShell>
  );
}

export function DealRoomDrawer({ trigger }: { trigger: ReactNode }) {
  const stats = useSiteStats();
  const { projects } = useProjectStore();
  const inReview = getInReviewCount(projects);

  return (
    <CapabilityDrawerShell
      trigger={trigger}
      overline="Private Collaboration Layer"
      title="Deal Room"
      description="A governed, invite-only workspace where approved investors and government stakeholders track a live deal through the same review pipeline that gates the public registry — visible only to the parties actually working it."
      footer={
        <PersonaGatedConsoleLink
          requiredPersona="admin"
          consoleHref="/deal-room-demo"
          consoleLabel="Open Internal Preview"
        />
      }
    >
      <div className="grid grid-cols-3 gap-3">
        <StatTile value={stats.totalProjects} label="Projects" />
        <StatTile value={stats.publishedProjects} label="Published" />
        <StatTile value={inReview} label="In Review" />
      </div>

      <div className="space-y-4">
        <FeatureRow
          icon={KanbanSquare}
          title="Project Kanban"
          description="Deal stages map directly onto the same draft → review → approve → publish workflow — no separate status model to keep in sync."
        />
        <FeatureRow
          icon={Landmark}
          title="Government Collaboration"
          description="Ministry-linked review lets the right government stakeholders track and act on projects in their portfolio."
        />
        <FeatureRow
          icon={FileCheck}
          title="Investor Engagement Log"
          description="Every investor's interest in a specific deal is tracked and approved individually, not inferred from general registration."
        />
      </div>

      <HighlightCallout icon={ShieldCheck}>
        <strong>Why it matters:</strong> the Deal Room is not a second public page — every project and
        every investor engagement in it is already governed by the same approval model as the rest of
        the platform.
      </HighlightCallout>
    </CapabilityDrawerShell>
  );
}
