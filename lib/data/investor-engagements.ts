import type { InvestorEngagement } from "@/lib/types";

/** Illustrative seed data for the Deal Room demo — mirrors the shape a real investor_proposals table would hold. */
export const seedInvestorEngagements: InvestorEngagement[] = [
  {
    id: "eng-001",
    projectId: "zim-zida-001",
    investorName: "Nomsa Dube",
    investorOrganization: "Kestrel Capital Partners",
    status: "approved",
    notes: "Term sheet under legal review; site visit completed Q2.",
    createdAt: "2026-04-02T09:00:00.000Z",
    updatedAt: "2026-05-14T11:30:00.000Z",
  },
  {
    id: "eng-002",
    projectId: "zim-zida-003",
    investorName: "James Okafor",
    investorOrganization: "Sahara Frontier Infrastructure Fund",
    status: "under_review",
    notes: "Awaiting updated feasibility study before proceeding to due diligence.",
    createdAt: "2026-05-20T14:15:00.000Z",
    updatedAt: "2026-05-28T08:45:00.000Z",
  },
  {
    id: "eng-003",
    projectId: "zim-zida-006",
    investorName: "Chipo Marufu",
    investorOrganization: "Diaspora Growth Syndicate",
    status: "submitted",
    createdAt: "2026-06-10T10:00:00.000Z",
    updatedAt: "2026-06-10T10:00:00.000Z",
  },
];
