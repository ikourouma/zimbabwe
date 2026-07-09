import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-zim-green-700 text-white",
        secondary: "border-transparent bg-zim-off-white text-zim-charcoal",
        outline: "text-zim-charcoal border-zim-border",
        gold: "border-transparent bg-zim-gold/20 text-zim-charcoal",
        warning: "border-transparent bg-amber-100 text-amber-800",
        success: "border-transparent bg-green-100 text-green-800",
        muted: "border-transparent bg-gray-100 text-gray-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
