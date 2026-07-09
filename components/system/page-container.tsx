import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  variant?: "sovereign" | "executive" | "briefing";
  className?: string;
  as?: React.ElementType;
}

export function PageContainer({
  children,
  variant = "sovereign",
  className = "",
  as: Tag = "div",
}: PageContainerProps) {
  const variantClass = {
    sovereign: "page-container",
    executive: "executive-container",
    briefing: "mx-auto w-full px-6 max-w-[680px]",
  }[variant];

  return <Tag className={cn(variantClass, className)}>{children}</Tag>;
}
