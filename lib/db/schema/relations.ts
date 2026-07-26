import { relations } from "drizzle-orm";
import { agencies, contactReasons, ministries, sdgs, sectors, strategicPillars, subsectors } from "./taxonomies";
import { projectDocuments } from "./documents";
import {
  projectPillars,
  projectRegulators,
  projectSdgs,
  projectSecondaryMinistries,
  projects,
} from "./projects";
import { strategicInquiries } from "./inquiries";
import { investorEngagements } from "./engagements";
import { profiles } from "./profiles";
import { projectMessages } from "./messages";
import { messageAttachments } from "./attachments";
import { engagementMous } from "./mous";

export const sectorsRelations = relations(sectors, ({ many }) => ({
  subsectors: many(subsectors),
  projects: many(projects),
}));

export const subsectorsRelations = relations(subsectors, ({ one, many }) => ({
  sector: one(sectors, { fields: [subsectors.sectorId], references: [sectors.id] }),
  projects: many(projects),
}));

export const ministriesRelations = relations(ministries, ({ many }) => ({
  primaryProjects: many(projects),
  secondaryProjectLinks: many(projectSecondaryMinistries),
  agencies: many(agencies),
  profiles: many(profiles),
}));

export const agenciesRelations = relations(agencies, ({ one, many }) => ({
  parentMinistry: one(ministries, { fields: [agencies.parentMinistryId], references: [ministries.id] }),
  implementedProjects: many(projects),
  regulatedProjectLinks: many(projectRegulators),
}));

export const contactReasonsRelations = relations(contactReasons, ({ many }) => ({
  inquiries: many(strategicInquiries),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  sector: one(sectors, { fields: [projects.sectorId], references: [sectors.id] }),
  subsector: one(subsectors, { fields: [projects.subsectorId], references: [subsectors.id] }),
  primaryBeneficiaryMinistry: one(ministries, {
    fields: [projects.primaryBeneficiaryMinistryId],
    references: [ministries.id],
  }),
  implementingAgency: one(agencies, {
    fields: [projects.implementingAgencyId],
    references: [agencies.id],
  }),
  pillarLinks: many(projectPillars),
  sdgLinks: many(projectSdgs),
  secondaryMinistryLinks: many(projectSecondaryMinistries),
  regulatorLinks: many(projectRegulators),
  documents: many(projectDocuments),
  inquiries: many(strategicInquiries),
  investorEngagements: many(investorEngagements),
  messages: many(projectMessages),
}));

export const projectPillarsRelations = relations(projectPillars, ({ one }) => ({
  project: one(projects, { fields: [projectPillars.projectId], references: [projects.id] }),
  pillar: one(strategicPillars, { fields: [projectPillars.pillarId], references: [strategicPillars.id] }),
}));

export const projectSdgsRelations = relations(projectSdgs, ({ one }) => ({
  project: one(projects, { fields: [projectSdgs.projectId], references: [projects.id] }),
  sdg: one(sdgs, { fields: [projectSdgs.sdgId], references: [sdgs.id] }),
}));

export const projectSecondaryMinistriesRelations = relations(projectSecondaryMinistries, ({ one }) => ({
  project: one(projects, { fields: [projectSecondaryMinistries.projectId], references: [projects.id] }),
  ministry: one(ministries, {
    fields: [projectSecondaryMinistries.ministryId],
    references: [ministries.id],
  }),
}));

export const projectRegulatorsRelations = relations(projectRegulators, ({ one }) => ({
  project: one(projects, { fields: [projectRegulators.projectId], references: [projects.id] }),
  agency: one(agencies, { fields: [projectRegulators.agencyId], references: [agencies.id] }),
}));

export const projectDocumentsRelations = relations(projectDocuments, ({ one }) => ({
  project: one(projects, { fields: [projectDocuments.projectId], references: [projects.id] }),
}));

export const strategicInquiriesRelations = relations(strategicInquiries, ({ one }) => ({
  project: one(projects, { fields: [strategicInquiries.projectId], references: [projects.id] }),
  contactReason: one(contactReasons, {
    fields: [strategicInquiries.contactReasonId],
    references: [contactReasons.id],
  }),
}));

export const investorEngagementsRelations = relations(investorEngagements, ({ one, many }) => ({
  project: one(projects, { fields: [investorEngagements.projectId], references: [projects.id] }),
  messages: many(projectMessages),
  mou: one(engagementMous, { fields: [investorEngagements.id], references: [engagementMous.engagementId] }),
}));

export const projectMessagesRelations = relations(projectMessages, ({ one, many }) => ({
  project: one(projects, { fields: [projectMessages.projectId], references: [projects.id] }),
  engagement: one(investorEngagements, {
    fields: [projectMessages.engagementId],
    references: [investorEngagements.id],
  }),
  parent: one(projectMessages, {
    fields: [projectMessages.parentMessageId],
    references: [projectMessages.id],
    relationName: "message_replies",
  }),
  replies: many(projectMessages, { relationName: "message_replies" }),
  attachments: many(messageAttachments),
}));

export const messageAttachmentsRelations = relations(messageAttachments, ({ one }) => ({
  message: one(projectMessages, {
    fields: [messageAttachments.messageId],
    references: [projectMessages.id],
  }),
}));

export const engagementMousRelations = relations(engagementMous, ({ one }) => ({
  engagement: one(investorEngagements, {
    fields: [engagementMous.engagementId],
    references: [investorEngagements.id],
  }),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  ministry: one(ministries, { fields: [profiles.ministryId], references: [ministries.id] }),
}));
