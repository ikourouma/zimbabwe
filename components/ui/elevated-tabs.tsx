"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

/**
 * "Sovereign/Fortune-100" tab chrome (Platform Feedback Batch v3, Phase 7) — a gold underline
 * active-state indicator with small-caps/tracking-wide labels and optional per-tab icons, instead
 * of the base `TabsList`/`TabsTrigger`'s flat `bg-white/5` pill look. Deliberately a separate pair
 * of components (built on the same Radix primitives) rather than a redesign of the shared
 * `components/ui/tabs.tsx` — that base component is still used as-is by several unrelated light-
 * and dark-themed surfaces (account settings, engagement drawer, activity report) this batch never
 * touched; scoping the redesign here keeps it to exactly the two drawers the feedback named
 * (ProjectDetailDrawer, UserDetailDrawer) without risking a platform-wide visual regression.
 */
const ElevatedTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "flex w-full items-center gap-1 overflow-x-auto rounded-none border-b p-0",
      className
    )}
    style={{ borderColor: "var(--color-sovereign-border)" }}
    {...props}
  />
));
ElevatedTabsList.displayName = "ElevatedTabsList";

interface ElevatedTabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  icon?: React.ComponentType<{ className?: string }>;
}

const ElevatedTabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, ElevatedTabsTriggerProps>(
  ({ className, icon: Icon, children, ...props }, ref) => (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-white/45 transition-colors",
        "hover:text-white/75",
        "data-[state=active]:border-[var(--color-gold)] data-[state=active]:text-white",
        "focus-visible:outline-none",
        className
      )}
      {...props}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </TabsPrimitive.Trigger>
  )
);
ElevatedTabsTrigger.displayName = "ElevatedTabsTrigger";

export { ElevatedTabsList, ElevatedTabsTrigger };
