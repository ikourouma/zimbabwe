import type { InvestmentProject } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/governance/project-workflow";
import { cn } from "@/lib/utils";

interface ProjectTimelineProps {
  project: InvestmentProject;
}

export function ProjectTimeline({ project }: ProjectTimelineProps) {
  const events = [
    { label: "Created", by: project.createdBy, at: project.createdAt, status: "draft" as const },
    project.submittedAt && { label: "Submitted", by: project.submittedBy, at: project.submittedAt, status: "submitted_for_review" as const },
    project.reviewedAt && { label: "Reviewed", by: project.reviewedBy, at: project.reviewedAt, status: "under_review" as const },
    project.approvedAt && { label: "Approved", by: project.approvedBy, at: project.approvedAt, status: "approved" as const },
    project.publishedAt && { label: "Published", by: project.publishedBy, at: project.publishedAt, status: "published" as const },
  ].filter(Boolean) as { label: string; by?: string; at: string; status: string }[];

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">Approval Timeline</h4>
      <ol className="relative border-l border-zim-border ml-2 space-y-4">
        {events.map((event, i) => (
          <li key={i} className="ml-4">
            <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-zim-green-700 bg-white" />
            <div className="text-sm font-medium">{event.label}</div>
            {event.by && <div className="text-xs text-zim-muted">By {event.by}</div>}
            <div className="text-xs text-zim-muted">
              {new Date(event.at).toLocaleDateString("en-GB", { dateStyle: "medium" })}
            </div>
          </li>
        ))}
        <li className="ml-4">
          <div className={cn("text-sm font-medium", project.projectStatus === project.projectStatus ? "" : "")}>
            Current: {STATUS_LABELS[project.projectStatus]}
          </div>
        </li>
      </ol>
      {project.reviewerNotes && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm">
          <div className="font-medium text-amber-800">Reviewer Notes</div>
          <p className="text-amber-700 mt-1">{project.reviewerNotes}</p>
        </div>
      )}
    </div>
  );
}
