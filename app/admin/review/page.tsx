"use client";

import { toast } from "sonner";
import { useProjectStore } from "@/context/project-store-context";
import { useAuth } from "@/context/auth-context";
import { roleToWorkflowRole } from "@/lib/auth/role-map";
import type { InvestmentProject, ProjectStatus } from "@/lib/types";
import { AccessGate } from "@/components/dashboard/access-gate";
import { StatusBadge } from "@/components/projects/status-badge";
import { ReviewActions } from "@/components/dashboard/review-actions";

const REVIEW_QUEUE_STATUSES: ProjectStatus[] = ["submitted_for_review", "under_review", "changes_requested", "approved"];

export default function AdminReviewQueuePage() {
  const { projects, updateProject, isLoading } = useProjectStore();
  const { isAdmin, role, isLoading: authLoading } = useAuth();

  const workflowRole = role ? roleToWorkflowRole(role) : null;
  const reviewQueue = projects.filter((p) => REVIEW_QUEUE_STATUSES.includes(p.projectStatus));

  const handleAction = async (project: InvestmentProject, status: ProjectStatus, notes?: string) => {
    try {
      await updateProject(project.id, { projectStatus: status, reviewerNotes: notes });
      toast.success(`"${project.title.slice(0, 40)}" moved to ${status.replace(/_/g, " ")}`);
    } catch {
      toast.error("Failed to update project status");
    }
  };

  if (!authLoading && !isAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Use an admin or government pilot account to review and action submitted projects."
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Review Queue</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          {reviewQueue.length} project(s) awaiting action. Available actions are driven by your role&apos;s governance
          rules — buttons only show transitions you&apos;re actually authorized to make.
        </p>
      </div>

      {isLoading || authLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="dashboard-panel p-5">
              <div className="dashboard-skeleton h-4 w-1/3 mb-3" />
              <div className="dashboard-skeleton h-3 w-full" />
            </div>
          ))}
        </div>
      ) : reviewQueue.length === 0 ? (
        <div className="dashboard-panel p-10 text-center" style={{ color: "var(--color-text-muted)" }}>
          No projects in the review queue.
        </div>
      ) : (
        <div className="space-y-4">
          {reviewQueue.map((project) => (
            <div key={project.id} className="dashboard-panel p-5">
              <div className="flex items-center justify-between gap-3 mb-2">
                <h3 className="text-sm font-semibold text-white">{project.title}</h3>
                <StatusBadge status={project.projectStatus} />
              </div>
              <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
                {project.opportunitySummary}
              </p>
              {project.reviewerNotes && (
                <div
                  className="rounded-md p-3 text-sm mb-4"
                  style={{ backgroundColor: "rgba(255, 211, 0, 0.1)", color: "#fde047" }}
                >
                  {project.reviewerNotes}
                </div>
              )}
              <ReviewActions
                project={project}
                role={workflowRole}
                onAction={(status, notes) => handleAction(project, status, notes)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
