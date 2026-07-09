"use client";

import { useDealRoomStore } from "@/context/deal-room-store-context";
import { useProjectStore } from "@/context/project-store-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InvestorEngagementStatus } from "@/lib/types";

const ENGAGEMENT_LABELS: Record<InvestorEngagementStatus, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
};

const ENGAGEMENT_BADGE_VARIANT: Record<InvestorEngagementStatus, BadgeProps["variant"]> = {
  submitted: "secondary",
  under_review: "warning",
  approved: "success",
  rejected: "muted",
};

interface DealRoomEngagementsProps {
  projectIds?: string[];
  /** Whether the current persona can change engagement status (government/admin/super_admin). */
  canManage: boolean;
}

export function DealRoomEngagements({ projectIds, canManage }: DealRoomEngagementsProps) {
  const { engagements, updateEngagementStatus } = useDealRoomStore();
  const { getProject } = useProjectStore();

  const visible = projectIds
    ? engagements.filter((e) => projectIds.includes(e.projectId))
    : engagements;

  if (visible.length === 0) {
    return <p className="text-sm text-zim-muted">No investor engagements recorded for this selection yet.</p>;
  }

  return (
    <div className="space-y-3">
      {visible.map((engagement) => {
        const project = getProject(engagement.projectId);
        return (
          <Card key={engagement.id}>
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">
                  {engagement.investorName}
                  {engagement.investorOrganization ? ` · ${engagement.investorOrganization}` : ""}
                </p>
                <p className="text-xs text-zim-muted mt-0.5">{project?.title ?? "Unknown project"}</p>
                {engagement.notes && <p className="text-xs text-zim-muted mt-1">{engagement.notes}</p>}
              </div>
              {canManage ? (
                <Select
                  value={engagement.status}
                  onValueChange={(v) => updateEngagementStatus(engagement.id, v as InvestorEngagementStatus)}
                >
                  <SelectTrigger className="w-[160px] shrink-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ENGAGEMENT_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant={ENGAGEMENT_BADGE_VARIANT[engagement.status]} className="shrink-0">
                  {ENGAGEMENT_LABELS[engagement.status]}
                </Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
