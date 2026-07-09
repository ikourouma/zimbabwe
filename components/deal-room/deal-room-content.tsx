"use client";

import { useMemo, useState } from "react";
import { useDemoPersona } from "@/context/demo-persona-context";
import { useProjectStore } from "@/context/project-store-context";
import { useDealRoomStore } from "@/context/deal-room-store-context";
import type { DemoPersona, InvestmentProject, ProjectStatus } from "@/lib/types";
import type { WorkflowRole } from "@/lib/governance/project-workflow";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RegistrationPrompt } from "@/components/shared/registration-prompt";
import { DealRoomKanban } from "@/components/deal-room/deal-room-kanban";
import { DealRoomEngagements } from "@/components/deal-room/deal-room-engagements";

/**
 * Maps a demo persona to the governance role used by `canTransition()`.
 * `null` means the persona can view the board but not drag cards between stages.
 */
function personaToWorkflowRole(persona: DemoPersona): WorkflowRole | null {
  if (persona === "government") return "reviewer";
  if (persona === "admin") return "approver";
  if (persona === "super_admin") return "super_admin";
  return null;
}

function actorLabel(persona: DemoPersona): string {
  if (persona === "government") return "Ministry Reviewer (Demo)";
  if (persona === "super_admin") return "Afronovation Super Admin (Demo)";
  if (persona === "admin") return "ZIDA Admin (Demo)";
  return "Deal Room (Demo)";
}

export function DealRoomContent() {
  const { persona, setPersona, isQualified } = useDemoPersona();
  const { projects, updateProject } = useProjectStore();
  const { engagements } = useDealRoomStore();
  const { ministries } = useTaxonomyStore();
  const [ministryFilter, setMinistryFilter] = useState("all");

  const role = personaToWorkflowRole(persona);

  const filteredProjects = useMemo(
    () =>
      ministryFilter === "all"
        ? projects
        : projects.filter((p) => p.primaryBeneficiaryMinistryId === ministryFilter),
    [projects, ministryFilter]
  );

  const handleStatusChange = (projectId: string, status: ProjectStatus) => {
    const now = new Date().toISOString();
    const updates: Partial<InvestmentProject> = { projectStatus: status };
    const actor = actorLabel(persona);
    if (status === "under_review" || status === "changes_requested") {
      updates.reviewedBy = actor;
      updates.reviewedAt = now;
    }
    if (status === "approved") {
      updates.approvedBy = actor;
      updates.approvedAt = now;
    }
    if (status === "published") {
      updates.publishedBy = actor;
      updates.publishedAt = now;
    }
    updateProject(projectId, updates);
  };

  if (!isQualified) {
    return (
      <div className="page-container py-20">
        <div className="mx-auto max-w-xl text-center">
          <Badge variant="warning" className="mb-4">Demo Preview — not connected to production systems</Badge>
          <h1>Deal Room</h1>
          <p className="text-zim-muted mt-2 mb-6">
            The Deal Room is reserved for qualified investors, government/ministry users, and platform
            admins working an active deal. Register and complete qualification to request access.
          </p>
          <RegistrationPrompt
            message="Register your interest to be considered for Deal Room access once your qualification is confirmed."
            ctaLabel="Register to request access"
          />
          <p className="text-xs text-zim-muted mt-6">
            Reviewing this demo?{" "}
            <button type="button" className="underline" onClick={() => setPersona("qualified")}>
              Preview as Qualified Investor
            </button>
            {" · "}
            <button type="button" className="underline" onClick={() => setPersona("government")}>
              Preview as Government
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container py-12">
      <Badge variant="warning" className="mb-4">Demo Preview — not connected to production systems</Badge>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1>Deal Room</h1>
          <p className="text-zim-muted mt-2 max-w-2xl">
            A private workspace for approved investors and government stakeholders to track deals through
            the governance workflow and log engagement on active projects.
          </p>
        </div>
        <div className="w-full sm:w-56">
          <Select value={ministryFilter} onValueChange={setMinistryFilter}>
            <SelectTrigger><SelectValue placeholder="All ministries" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ministries</SelectItem>
              {ministries.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.shortName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="kanban" className="mt-8">
        <TabsList>
          <TabsTrigger value="kanban">Project Kanban</TabsTrigger>
          <TabsTrigger value="engagements">Investor Engagements ({engagements.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-6">
          <DealRoomKanban projects={filteredProjects} role={role} onStatusChange={handleStatusChange} />
        </TabsContent>

        <TabsContent value="engagements" className="mt-6">
          <DealRoomEngagements
            projectIds={ministryFilter === "all" ? undefined : filteredProjects.map((p) => p.id)}
            canManage={role !== null}
          />
        </TabsContent>
      </Tabs>

      {persona === "qualified" && (
        <div className="mt-8">
          <Button type="button" variant="outline" size="sm" onClick={() => setPersona("government")}>
            Preview as Government persona (reviewer actions)
          </Button>
        </div>
      )}
    </div>
  );
}
