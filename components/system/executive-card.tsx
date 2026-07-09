import { cn } from "@/lib/utils";

interface ExecutiveCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "panel" | "highlighted";
}

export function ExecutiveCard({ children, className = "", variant = "default" }: ExecutiveCardProps) {
  const variantClass = {
    default: "executive-card",
    panel: "sovereign-panel",
    highlighted: "executive-card border-[var(--color-zim-green)]/40",
  }[variant];

  return <div className={cn(variantClass, className)}>{children}</div>;
}

interface CardHeaderProps {
  overline?: string;
  title: string;
  badge?: React.ReactNode;
}

ExecutiveCard.Header = function CardHeader({ overline, title, badge }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        {overline && <p className="section-overline mb-1">{overline}</p>}
        <h3 className="text-lg font-medium text-white" style={{ letterSpacing: "var(--type-heading-tracking)" }}>
          {title}
        </h3>
      </div>
      {badge && <div className="shrink-0">{badge}</div>}
    </div>
  );
};

ExecutiveCard.Body = function CardBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
      {children}
    </div>
  );
};
