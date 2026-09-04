"use client";

import type { ProjectStatus } from "@/lib/types";
import { STATUS_COLORS } from "@/lib/governance/project-workflow";
import { useTranslations } from "@/context/locale-context";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const t = useTranslations();

  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold",
        STATUS_COLORS[status],
      )}
    >
      {t.projectDetail.status[status]}
    </span>
  );
}
