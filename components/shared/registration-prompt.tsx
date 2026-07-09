import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface RegistrationPromptProps {
  message?: string;
  ctaLabel?: string;
  /** Where the CTA points — defaults to /register. Callers that need a second-stage prompt (e.g.
   *  "you're registered, now request qualified investor access") pass /strategic-partnerships here
   *  instead, since sending an already-registered visitor back through /register makes no sense. */
  ctaHref?: string;
  /** Matches the CapitalBreakdown/EstInvestmentRange/ProjectCard convention: true for the
   *  sovereign dark-theme pages, false (default) for light zim-theme pages. The default `Card`
   *  is hardcoded to a white background, which would clash on a dark shell. */
  dark?: boolean;
}

export function RegistrationPrompt({
  message = "Register to view expanded project details, financial indicators, and scope information.",
  ctaLabel = "Register to unlock",
  ctaHref = "/register",
  dark = false,
}: RegistrationPromptProps) {
  if (dark) {
    return (
      <div
        className="rounded-lg border border-dashed p-8 flex flex-col items-center gap-3 text-center"
        style={{ borderColor: "rgba(255,211,0,0.35)", backgroundColor: "rgba(255,211,0,0.05)" }}
      >
        <Lock className="h-8 w-8" style={{ color: "var(--color-gold)" }} />
        <p className="text-sm max-w-md" style={{ color: "var(--color-text-secondary)" }}>{message}</p>
        <Link href={ctaHref} className="btn-sovereign text-xs px-4 py-2">
          {ctaLabel}
        </Link>
      </div>
    );
  }

  return (
    <Card className="border-dashed border-zim-gold/50 bg-zim-gold/5">
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
        <Lock className="h-8 w-8 text-zim-gold" />
        <p className="text-sm text-zim-muted max-w-md">{message}</p>
        <Button asChild variant="gold">
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
