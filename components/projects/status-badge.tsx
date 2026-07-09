import type { ProjectStatus } from "@/lib/types";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/governance/project-workflow";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        STATUS_COLORS[status]
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
