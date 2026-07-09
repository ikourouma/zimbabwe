"use client";

import type { InvestmentProject } from "@/lib/types";
import { useProjectStore } from "@/context/project-store-context";
import { useLeadCapture } from "@/context/lead-capture-context";
import { useDemoPersona } from "@/context/demo-persona-context";
import { ProjectForm, ReviewActions } from "@/components/admin/project-form";
import { StatusBadge } from "@/components/projects/status-badge";
import { ProjectTimeline } from "@/components/projects/project-timeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { slugify } from "@/lib/utils";
import { toast } from "sonner";
import type { ProjectStatus, LeadInquiry } from "@/lib/types";
import { SITE_URL } from "@/lib/config/site";
import { getRoutingDesk } from "@/lib/data/routing-desks";
import { sectors } from "@/lib/data/taxonomies";

const ENGAGEMENT_TYPE_LABELS: Record<string, string> = {
  investor: "Investor",
  government_dfi: "Government / DFI",
  strategic_partner: "Strategic Partner",
};

function describeInterest(inq: LeadInquiry): string {
  if (inq.ministryRepresented) return inq.ministryRepresented;
  if (inq.sectorIds?.length) {
    const names = inq.sectorIds.map((id) => sectors.find((s) => s.id === id)?.name).filter(Boolean);
    const ticket = inq.ticketSizeRange ? ` · ${inq.ticketSizeRange}` : "";
    return `${names.join(", ")}${ticket}`;
  }
  if (inq.ticketSizeRange) return inq.ticketSizeRange;
  if (inq.partnershipType) return inq.partnershipType;
  return "—";
}

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Platform Concept", item: `${SITE_URL}/platform` },
    { "@type": "ListItem", position: 3, name: "Admin Demo", item: `${SITE_URL}/admin-demo` },
  ],
};

export default function AdminDemoPage() {
  const { projects, addProject, updateProject } = useProjectStore();
  const { inquiries, updateInquiryStatus } = useLeadCapture();
  const { setPersona } = useDemoPersona();

  const reviewQueue = projects.filter((p) =>
    ["submitted_for_review", "under_review", "changes_requested", "approved"].includes(p.projectStatus)
  );

  const handleCreate = (partial: Partial<InvestmentProject>, submit = false) => {
    const now = new Date().toISOString();
    const newProject: InvestmentProject = {
      id: `zim-demo-${Date.now()}`,
      title: partial.title!,
      slug: slugify(partial.title!),
      sectorId: partial.sectorId!,
      subsectorId: partial.subsectorId,
      strategicPillarIds: partial.strategicPillarIds ?? [],
      sdgIds: partial.sdgIds ?? [],
      primaryBeneficiaryMinistryId: partial.primaryBeneficiaryMinistryId!,
      secondaryBeneficiaryMinistryIds: partial.secondaryBeneficiaryMinistryIds,
      projectOwner: partial.projectOwner!,
      location: partial.location!,
      province: partial.province,
      capitalRequired: partial.capitalRequired,
      financingType: partial.financingType,
      projectReadiness: partial.projectReadiness!,
      projectStatus: submit ? "submitted_for_review" : "draft",
      visibilityLevel: partial.visibilityLevel ?? "public",
      opportunitySummary: partial.opportunitySummary!,
      description: partial.description!,
      scope: partial.scope ?? [],
      developmentImpact: partial.developmentImpact ?? [],
      documents: partial.documents ?? [],
      dataVerificationStatus: "pending_review",
      sourceReference: "Created via Admin Demo",
      createdBy: "ZIDA Admin (Demo)",
      submittedBy: submit ? "ZIDA Admin (Demo)" : undefined,
      createdAt: now,
      updatedAt: now,
      submittedAt: submit ? now : undefined,
    };
    addProject(newProject);
    if (submit) toast.success("Project submitted for review");
  };

  const handleReviewAction = (projectId: string, status: ProjectStatus, notes?: string) => {
    const now = new Date().toISOString();
    const updates: Partial<InvestmentProject> = {
      projectStatus: status,
      updatedAt: now,
      reviewedBy: "ZIDA Reviewer (Demo)",
      reviewedAt: now,
    };
    if (status === "approved") {
      updates.approvedBy = "ZIDA Reviewer (Demo)";
      updates.approvedAt = now;
    }
    if (status === "published") {
      updates.publishedBy = "ZIDA Reviewer (Demo)";
      updates.publishedAt = now;
    }
    if (notes) updates.reviewerNotes = notes;
    updateProject(projectId, updates);
    toast.success(`Project status updated to ${status.replace(/_/g, " ")}`);
  };

  return (
    <div className="page-container py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Badge variant="warning" className="mb-4">Demo Preview — not connected to production systems</Badge>
      <h1>Institutional Admin Demo</h1>
      <p className="text-zim-muted mt-2 mb-6">
        Preview how ZIDA and government users manage projects, review submissions, and handle investor inquiries.
      </p>

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="review">Review Queue ({reviewQueue.length})</TabsTrigger>
          <TabsTrigger value="inquiries">Inquiries ({inquiries.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <ProjectForm
              mode="create"
              onSave={(p) => handleCreate(p, false)}
              onSubmit={(p) => handleCreate(p, true)}
            />
            <Card>
              <CardHeader><CardTitle className="text-base">All Projects ({projects.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm font-medium">{p.title.slice(0, 40)}…</TableCell>
                          <TableCell><StatusBadge status={p.projectStatus} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="review" className="mt-6 space-y-4">
          {reviewQueue.length === 0 ? (
            <p className="text-zim-muted">No projects in review queue.</p>
          ) : (
            reviewQueue.map((project) => (
              <Card key={project.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{project.title}</CardTitle>
                    <StatusBadge status={project.projectStatus} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-zim-muted">{project.opportunitySummary}</p>
                  {project.reviewerNotes && (
                    <div className="rounded bg-amber-50 p-3 text-sm text-amber-800">{project.reviewerNotes}</div>
                  )}
                  <ProjectTimeline project={project} />
                  <ReviewActions project={project} onAction={(status, notes) => handleReviewAction(project.id, status, notes)} />
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="inquiries" className="mt-6">
          {inquiries.length === 0 ? (
            <p className="text-zim-muted">No inquiries yet. Submit via Contact or Register pages.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Engagement Type</TableHead>
                    <TableHead>Sector / Ticket / Ministry</TableHead>
                    <TableHead>Routed Desk</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inquiries.map((inq) => {
                    const status = inq.status ?? "pending";
                    return (
                      <TableRow key={inq.id}>
                        <TableCell><Badge variant="outline">{inq.type.replace("_", " ")}</Badge></TableCell>
                        <TableCell>{inq.name}</TableCell>
                        <TableCell>{inq.email}</TableCell>
                        <TableCell className="text-sm">
                          {inq.engagementType ? ENGAGEMENT_TYPE_LABELS[inq.engagementType] ?? inq.engagementType : "—"}
                        </TableCell>
                        <TableCell className="text-sm">{describeInterest(inq)}</TableCell>
                        <TableCell className="text-sm">
                          {inq.type === "strategic_partnership" ||
                          inq.type === "document_request" ||
                          inq.type === "meeting_request" ||
                          inq.type === "investment_interest" ? (
                            <Badge variant="secondary">
                              {getRoutingDesk(inq.engagementType, Boolean(inq.projectId))}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-zim-muted">
                          {new Date(inq.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={status === "approved" ? "success" : status === "declined" ? "muted" : "outline"}
                          >
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {status === "pending" ? (
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={() => updateInquiryStatus(inq.id, "approved")}
                              >
                                {inq.engagementType === "investor" ? "Approve as Qualified Investor" : "Approve"}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 px-2 text-xs"
                                onClick={() => updateInquiryStatus(inq.id, "declined")}
                              >
                                Decline
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => updateInquiryStatus(inq.id, "pending")}
                            >
                              Reset
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-6">
        <button
          type="button"
          className="text-sm text-zim-green-700 underline"
          onClick={() => setPersona("admin")}
        >
          Switch to Admin persona in header for full admin view on project pages
        </button>
      </div>
    </div>
  );
}
