"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;
const DialogPortal = DialogPrimitive.Portal;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { hideClose?: boolean }
>(({ className, children, hideClose = false, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Radix locks body scroll while a dialog is open and this panel is `fixed`, so content
        // taller than the viewport was previously unreachable — no scrollbar, nothing to scroll.
        // On a phone, a dialog whose content exceeds the viewport (e.g. the NDA gate for a
        // qualified investor, clauses + KYC fields + accept button) had no way to reach the
        // controls below the fold. The outer frame stays unscrolled and unpadded — it only holds
        // the max-height and the close button, which must stay reachable regardless of scroll
        // position — and the inner div below carries the padding and the scroll. `svh` rather
        // than `dvh`: `dvh` recalculates as mobile browser chrome hides/shows, which would resize
        // the dialog mid-scroll on iOS. A dialog that already fits the viewport is unaffected.
        "fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100svh-2rem)] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg shadow-2xl focus:outline-none",
        className
      )}
      style={{
        backgroundColor: "var(--color-sovereign-panel)",
        border: "1px solid var(--color-sovereign-border)",
      }}
      {...props}
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
      {/* hideClose is used by non-dismissible gates (e.g. the Deal Room NdaGate clickwrap).
          Sits in the unscrolled outer frame, so it stays reachable at every scroll position. */}
      {!hideClose && (
        <DialogPrimitive.Close
          className="absolute right-4 top-4 rounded-full p-1.5 transition-colors hover:bg-white/10 focus:outline-none"
          style={{ color: "var(--color-text-muted)" }}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mb-4 pr-8", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-6 flex flex-wrap items-center justify-end gap-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("font-medium text-lg text-white", className)}
    style={{ letterSpacing: "var(--type-heading-tracking)" }}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm mt-2", className)}
    style={{ color: "var(--color-text-secondary)" }}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
