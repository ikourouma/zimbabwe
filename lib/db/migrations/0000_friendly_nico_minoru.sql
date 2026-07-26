CREATE TYPE "public"."account_role" AS ENUM('registered', 'qualified', 'government', 'admin', 'super_admin');--> statement-breakpoint
CREATE TYPE "public"."account_status" AS ENUM('active', 'suspended', 'pending');--> statement-breakpoint
CREATE TYPE "public"."agency_type" AS ENUM('agency', 'regulator', 'parastatal');--> statement-breakpoint
CREATE TYPE "public"."data_verification_status" AS ENUM('unverified', 'pending_review', 'verified');--> statement-breakpoint
CREATE TYPE "public"."engagement_type" AS ENUM('investor', 'government_dfi', 'strategic_partner');--> statement-breakpoint
CREATE TYPE "public"."entity_status" AS ENUM('active', 'inactive', 'pending_validation');--> statement-breakpoint
CREATE TYPE "public"."inquiry_status" AS ENUM('pending', 'approved', 'declined');--> statement-breakpoint
CREATE TYPE "public"."investor_engagement_status" AS ENUM('submitted', 'under_review', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."lead_inquiry_type" AS ENUM('registration', 'contact', 'investment_interest', 'document_request', 'meeting_request', 'strategic_partnership');--> statement-breakpoint
CREATE TYPE "public"."ministry_type" AS ENUM('beneficiary', 'implementing');--> statement-breakpoint
CREATE TYPE "public"."pipeline_type" AS ENUM('zida_catalogue', 'policy_initiative');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('draft', 'submitted_for_review', 'under_review', 'changes_requested', 'approved', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."user_role_scope" AS ENUM('platform', 'tenant', 'institutional');--> statement-breakpoint
CREATE TYPE "public"."visibility_level" AS ENUM('public', 'registered', 'qualified_investor', 'admin_only');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"storage_key" text NOT NULL,
	"visibility_level" "visibility_level" DEFAULT 'qualified_investor' NOT NULL,
	"uploaded_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investor_engagements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"investor_name" text NOT NULL,
	"investor_organization" text,
	"status" "investor_engagement_status" DEFAULT 'submitted' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agencies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"parent_ministry_id" text,
	"type" "agency_type" NOT NULL,
	"status" "entity_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_reasons" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"routing_category" text NOT NULL,
	"status" "entity_status" DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ministries" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"type" "ministry_type" NOT NULL,
	"representative_title" text,
	"status" "entity_status" DEFAULT 'pending_validation' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provinces" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "provinces_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sdgs" (
	"id" text PRIMARY KEY NOT NULL,
	"number" integer NOT NULL,
	"name" text NOT NULL,
	"color_token" text NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sectors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"status" "entity_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sectors_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "strategic_pillars" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"strategic_mandate" text NOT NULL,
	"target_outcomes" text[] NOT NULL,
	"policy_alignment_primary" text NOT NULL,
	"policy_alignment_secondary" text,
	"status" "entity_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "strategic_pillars_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "subsectors" (
	"id" text PRIMARY KEY NOT NULL,
	"sector_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" "entity_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"permissions" text[] NOT NULL,
	"scope" "user_role_scope" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_pillars" (
	"project_id" uuid NOT NULL,
	"pillar_id" text NOT NULL,
	CONSTRAINT "project_pillars_project_id_pillar_id_pk" PRIMARY KEY("project_id","pillar_id")
);
--> statement-breakpoint
CREATE TABLE "project_regulators" (
	"project_id" uuid NOT NULL,
	"agency_id" text NOT NULL,
	CONSTRAINT "project_regulators_project_id_agency_id_pk" PRIMARY KEY("project_id","agency_id")
);
--> statement-breakpoint
CREATE TABLE "project_sdgs" (
	"project_id" uuid NOT NULL,
	"sdg_id" text NOT NULL,
	CONSTRAINT "project_sdgs_project_id_sdg_id_pk" PRIMARY KEY("project_id","sdg_id")
);
--> statement-breakpoint
CREATE TABLE "project_secondary_ministries" (
	"project_id" uuid NOT NULL,
	"ministry_id" text NOT NULL,
	CONSTRAINT "project_secondary_ministries_project_id_ministry_id_pk" PRIMARY KEY("project_id","ministry_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"sector_id" text NOT NULL,
	"subsector_id" text,
	"pipeline_type" "pipeline_type" DEFAULT 'zida_catalogue' NOT NULL,
	"primary_beneficiary_ministry_id" text NOT NULL,
	"implementing_agency_id" text,
	"project_owner" text NOT NULL,
	"location" text NOT NULL,
	"province" text,
	"district" text,
	"capital_required" text,
	"financing_type" text,
	"project_readiness" text NOT NULL,
	"project_status" "project_status" DEFAULT 'draft' NOT NULL,
	"visibility_level" "visibility_level" DEFAULT 'public' NOT NULL,
	"irr" text,
	"npv" text,
	"roi" text,
	"payback_period" text,
	"projected_revenue" text,
	"opportunity_summary" text NOT NULL,
	"description" text NOT NULL,
	"scope" text[] DEFAULT '{}' NOT NULL,
	"development_impact" text[] DEFAULT '{}' NOT NULL,
	"source_reference" text,
	"data_verification_status" "data_verification_status" DEFAULT 'unverified' NOT NULL,
	"reviewer_notes" text,
	"created_by" text NOT NULL,
	"submitted_by" text,
	"reviewed_by" text,
	"approved_by" text,
	"published_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "strategic_inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "lead_inquiry_type" NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"organization" text,
	"message" text,
	"contact_reason_id" text,
	"project_id" uuid,
	"engagement_type" "engagement_type",
	"investor_type" text,
	"sector_ids" text[],
	"ticket_size_range" text,
	"partnership_type" text,
	"ministry_represented" text,
	"nature_of_engagement" text,
	"status" "inquiry_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"cost_structure_hidden" boolean DEFAULT false NOT NULL,
	"flash_banner_enabled" boolean DEFAULT false NOT NULL,
	"flash_banner_message" text,
	"flash_banner_cta_label" text,
	"flash_banner_cta_href" text,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"role" "account_role" DEFAULT 'registered' NOT NULL,
	"organization" text,
	"ministry_id" text,
	"account_status" "account_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investor_engagements" ADD CONSTRAINT "investor_engagements_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agencies" ADD CONSTRAINT "agencies_parent_ministry_id_ministries_id_fk" FOREIGN KEY ("parent_ministry_id") REFERENCES "public"."ministries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subsectors" ADD CONSTRAINT "subsectors_sector_id_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."sectors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_pillars" ADD CONSTRAINT "project_pillars_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_pillars" ADD CONSTRAINT "project_pillars_pillar_id_strategic_pillars_id_fk" FOREIGN KEY ("pillar_id") REFERENCES "public"."strategic_pillars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_regulators" ADD CONSTRAINT "project_regulators_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_regulators" ADD CONSTRAINT "project_regulators_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_sdgs" ADD CONSTRAINT "project_sdgs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_sdgs" ADD CONSTRAINT "project_sdgs_sdg_id_sdgs_id_fk" FOREIGN KEY ("sdg_id") REFERENCES "public"."sdgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_secondary_ministries" ADD CONSTRAINT "project_secondary_ministries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_secondary_ministries" ADD CONSTRAINT "project_secondary_ministries_ministry_id_ministries_id_fk" FOREIGN KEY ("ministry_id") REFERENCES "public"."ministries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_sector_id_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."sectors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_subsector_id_subsectors_id_fk" FOREIGN KEY ("subsector_id") REFERENCES "public"."subsectors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_primary_beneficiary_ministry_id_ministries_id_fk" FOREIGN KEY ("primary_beneficiary_ministry_id") REFERENCES "public"."ministries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_implementing_agency_id_agencies_id_fk" FOREIGN KEY ("implementing_agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategic_inquiries" ADD CONSTRAINT "strategic_inquiries_contact_reason_id_contact_reasons_id_fk" FOREIGN KEY ("contact_reason_id") REFERENCES "public"."contact_reasons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategic_inquiries" ADD CONSTRAINT "strategic_inquiries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_ministry_id_ministries_id_fk" FOREIGN KEY ("ministry_id") REFERENCES "public"."ministries"("id") ON DELETE set null ON UPDATE no action;