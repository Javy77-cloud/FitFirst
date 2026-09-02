CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"entity_type" text,
	"entity_id" uuid,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appetite_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"carrier_id" uuid NOT NULL,
	"line_of_business" text DEFAULT 'HO' NOT NULL,
	"min_cov_a" integer,
	"max_cov_a" integer,
	"min_year_built" integer,
	"max_roof_age" integer,
	"allowed_roof_coverings" jsonb,
	"coastal_allowed" boolean DEFAULT true NOT NULL,
	"min_miles_to_coast" real,
	"max_miles_to_coast" real,
	"mobile_allowed" boolean DEFAULT false NOT NULL,
	"requires_opening_protection" boolean DEFAULT false NOT NULL,
	"max_stories" integer,
	"allowed_construction" jsonb,
	"allowed_occupancy" jsonb,
	"allowed_counties" jsonb,
	"excluded_counties" jsonb,
	"county_min_cov_a" jsonb,
	"require_replacement_cost" boolean DEFAULT false NOT NULL,
	"rce_floor_ratio" real,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carriers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"naic" text,
	"written_lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dont_write_notes" text,
	"portal_status" text DEFAULT 'open' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"fixture_tag" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"deal_id" uuid,
	"policy_id" uuid,
	"event_type" text NOT NULL,
	"body" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"mailing_address" text,
	"city" text,
	"state" text,
	"zip" text,
	"tenure_start" timestamp with time zone,
	"policy_count" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"life_notes" text,
	"health_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lead_id" uuid,
	"contact_id" uuid,
	"title" text NOT NULL,
	"pipeline_stage" text DEFAULT 'shopping' NOT NULL,
	"line_of_business" text DEFAULT 'HO' NOT NULL,
	"state" text DEFAULT 'FL' NOT NULL,
	"notes" text,
	"bound_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"risk_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"storage_path" text NOT NULL,
	"doc_type" text DEFAULT 'other' NOT NULL,
	"status" text DEFAULT 'uploaded' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extracted_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"risk_id" uuid NOT NULL,
	"field_key" text NOT NULL,
	"raw_value" text NOT NULL,
	"normalized_value" text NOT NULL,
	"confidence" numeric(4, 3) NOT NULL,
	"flagged" boolean DEFAULT false NOT NULL,
	"applied_to_risk" boolean DEFAULT false NOT NULL,
	"reviewer_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"source" text,
	"status" text DEFAULT 'new' NOT NULL,
	"notes" text,
	"converted_deal_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"deal_id" uuid,
	"risk_id" uuid,
	"carrier_id" uuid,
	"policy_number" text NOT NULL,
	"line_of_business" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"effective_date" timestamp with time zone NOT NULL,
	"expiration_date" timestamp with time zone NOT NULL,
	"premium" integer,
	"coverage_a" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_attempt_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"risk_id" uuid NOT NULL,
	"carrier_id" uuid NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"line_of_business" text DEFAULT 'HO' NOT NULL,
	"result" text NOT NULL,
	"bindable" boolean DEFAULT false NOT NULL,
	"quote_number" text,
	"premium" integer,
	"cov_a_tried" integer,
	"cov_a_forced" integer,
	"why" text,
	"snap_year_built" integer,
	"snap_roof_year" integer,
	"snap_roof_covering" text,
	"snap_construction" text,
	"snap_opening_protection" text,
	"snap_occupancy" text,
	"snap_stories" integer,
	"snap_pool" boolean,
	"snap_protection_class" text,
	"snap_miles_to_coast" real,
	"snap_city" text,
	"snap_county" text,
	"snap_coverage_a" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"risk_id" uuid NOT NULL,
	"carrier_id" uuid NOT NULL,
	"quote_attempt_log_id" uuid,
	"quote_number" text,
	"premium" integer,
	"hurricane_deductible" text,
	"aop_deductible" text,
	"coverage_a" integer,
	"bindable" boolean DEFAULT false NOT NULL,
	"coverage_gaps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"stub" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contact_id" uuid,
	"policy_id" uuid,
	"deal_id" uuid,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"contact_id" uuid,
	"risk_type" text DEFAULT 'property' NOT NULL,
	"address1" text,
	"city" text,
	"county" text,
	"state" text DEFAULT 'FL',
	"zip" text,
	"year_built" integer,
	"construction" text,
	"occupancy" text,
	"stories" integer,
	"square_feet" integer,
	"coverage_a" integer,
	"roof_year" integer,
	"roof_covering" text,
	"opening_protection" text,
	"pool" boolean,
	"protection_class" text,
	"miles_to_coast" real,
	"mobile_home" boolean DEFAULT false NOT NULL,
	"replacement_cost_estimate" integer,
	"vin" text,
	"vehicle_year" integer,
	"vehicle_make" text,
	"vehicle_model" text,
	"vehicle_usage" text,
	"garaging_zip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appetite_rules" ADD CONSTRAINT "appetite_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appetite_rules" ADD CONSTRAINT "appetite_rules_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carriers" ADD CONSTRAINT "carriers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_history" ADD CONSTRAINT "client_history_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_history" ADD CONSTRAINT "client_history_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_history" ADD CONSTRAINT "client_history_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_history" ADD CONSTRAINT "client_history_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_risk_id_risks_id_fk" FOREIGN KEY ("risk_id") REFERENCES "public"."risks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_fields" ADD CONSTRAINT "extracted_fields_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_fields" ADD CONSTRAINT "extracted_fields_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_fields" ADD CONSTRAINT "extracted_fields_risk_id_risks_id_fk" FOREIGN KEY ("risk_id") REFERENCES "public"."risks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_risk_id_risks_id_fk" FOREIGN KEY ("risk_id") REFERENCES "public"."risks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_attempt_logs" ADD CONSTRAINT "quote_attempt_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_attempt_logs" ADD CONSTRAINT "quote_attempt_logs_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_attempt_logs" ADD CONSTRAINT "quote_attempt_logs_risk_id_risks_id_fk" FOREIGN KEY ("risk_id") REFERENCES "public"."risks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_attempt_logs" ADD CONSTRAINT "quote_attempt_logs_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_risk_id_risks_id_fk" FOREIGN KEY ("risk_id") REFERENCES "public"."risks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_quote_attempt_log_id_quote_attempt_logs_id_fk" FOREIGN KEY ("quote_attempt_log_id") REFERENCES "public"."quote_attempt_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_tasks" ADD CONSTRAINT "review_tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_tasks" ADD CONSTRAINT "review_tasks_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_tasks" ADD CONSTRAINT "review_tasks_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_tasks" ADD CONSTRAINT "review_tasks_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risks" ADD CONSTRAINT "risks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risks" ADD CONSTRAINT "risks_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risks" ADD CONSTRAINT "risks_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alerts_tenant_unread_idx" ON "alerts" USING btree ("tenant_id","read_at");--> statement-breakpoint
CREATE INDEX "appetite_rules_tenant_carrier_idx" ON "appetite_rules" USING btree ("tenant_id","carrier_id");--> statement-breakpoint
CREATE INDEX "carriers_tenant_idx" ON "carriers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "client_history_tenant_idx" ON "client_history" USING btree ("tenant_id","contact_id");--> statement-breakpoint
CREATE INDEX "contacts_tenant_idx" ON "contacts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "deals_tenant_idx" ON "deals" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "deals_stage_idx" ON "deals" USING btree ("tenant_id","pipeline_stage");--> statement-breakpoint
CREATE INDEX "documents_tenant_risk_idx" ON "documents" USING btree ("tenant_id","risk_id");--> statement-breakpoint
CREATE INDEX "extracted_fields_doc_idx" ON "extracted_fields" USING btree ("tenant_id","document_id");--> statement-breakpoint
CREATE INDEX "leads_tenant_idx" ON "leads" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "policies_tenant_idx" ON "policies" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "policies_exp_idx" ON "policies" USING btree ("tenant_id","expiration_date");--> statement-breakpoint
CREATE INDEX "quote_logs_tenant_idx" ON "quote_attempt_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "quote_logs_carrier_idx" ON "quote_attempt_logs" USING btree ("tenant_id","carrier_id");--> statement-breakpoint
CREATE INDEX "quotes_tenant_deal_idx" ON "quotes" USING btree ("tenant_id","deal_id");--> statement-breakpoint
CREATE INDEX "review_tasks_tenant_idx" ON "review_tasks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "review_tasks_due_idx" ON "review_tasks" USING btree ("tenant_id","status","due_date");--> statement-breakpoint
CREATE INDEX "risks_tenant_idx" ON "risks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "risks_deal_idx" ON "risks" USING btree ("tenant_id","deal_id");