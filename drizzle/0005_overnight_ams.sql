ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "mailing_address" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "state" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "zip" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "date_of_birth" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "merged_into_id" uuid;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "owner_id" uuid;

ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "date_of_birth" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "language" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "marital_status" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "client_status" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "lifetime_policy_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "account_id" uuid;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "zoho_id" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "source_id" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active' NOT NULL;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "merged_into_id" uuid;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "owner_id" uuid;

ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "owner_id" uuid;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "shop_lines" jsonb;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "coverage_amount" integer;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "property_oneliner" text;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "current_carrier" text;

ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "form_type" text;
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "original_effective_date" timestamp with time zone;
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "billing_frequency" text;
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "term_months" integer;
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "producer" text;
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "premises_address" text;
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "premises_city" text;
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "premises_state" text;
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "premises_zip" text;
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "zoho_id" text;
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "source_id" text;
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "ended_at" timestamp with time zone;
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "end_reason" text;
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "owner_id" uuid;
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "coverage_limits" jsonb;
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "location_id" uuid;

ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "operations_description" text;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "legal_name" text;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "wc_class_code" text;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "client_since" timestamp with time zone;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "zoho_id" text;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "source_id" text;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "bound_policy_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "pending_policy_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "lifetime_policy_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "primary_address1" text;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "primary_city" text;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "primary_county" text;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "primary_state" text;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "primary_zip" text;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "mailing_same_as_primary" boolean DEFAULT true NOT NULL;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "officer_contact_id" uuid;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "website" text;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "is_example" boolean DEFAULT false NOT NULL;

ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "lead_id" uuid;
ALTER TABLE "review_tasks" ADD COLUMN IF NOT EXISTS "work_item_id" uuid;

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "name" text NOT NULL,
  "email" text NOT NULL,
  "role" text DEFAULT 'agent' NOT NULL,
  "password_hash" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "carrier_appointments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "carrier_id" uuid NOT NULL REFERENCES "carriers"("id"),
  "written_line" text NOT NULL,
  "appointed" boolean DEFAULT true NOT NULL,
  "selling_agency" text,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "carrier_appointments_line_uidx" ON "carrier_appointments" ("tenant_id","carrier_id","written_line");

CREATE TABLE IF NOT EXISTS "locations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "contact_id" uuid REFERENCES "contacts"("id"),
  "lead_id" uuid REFERENCES "leads"("id"),
  "account_id" uuid REFERENCES "accounts"("id"),
  "kind" text DEFAULT 'mailing' NOT NULL,
  "label" text,
  "address1" text,
  "street" text,
  "city" text,
  "county" text,
  "state" text,
  "zip" text,
  "occupancy" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "merge_candidates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "entity_type" text NOT NULL,
  "left_id" uuid NOT NULL,
  "right_id" uuid NOT NULL,
  "match_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "keeper_id" uuid,
  "duplicate_id" uuid,
  "merged_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "merge_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "entity_type" text NOT NULL,
  "keeper_id" uuid NOT NULL,
  "duplicate_id" uuid NOT NULL,
  "copied_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "relinked" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "issued_certificates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "account_id" uuid REFERENCES "accounts"("id"),
  "business_id" uuid,
  "certificate_number" text NOT NULL,
  "holder_name" text NOT NULL,
  "holder_address" text,
  "job_location" text,
  "lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "producer_name" text,
  "issued_at" timestamp with time zone DEFAULT now() NOT NULL,
  "status" text DEFAULT 'issued' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "claims" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "policy_id" uuid REFERENCES "policies"("id"),
  "date_reported" timestamp with time zone,
  "date_of_loss" timestamp with time zone,
  "cause_type" text,
  "description" text,
  "reported_how" text,
  "carrier_claim_number" text,
  "status" text DEFAULT 'inquiry' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "claim_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "claim_id" uuid NOT NULL REFERENCES "claims"("id"),
  "body" text NOT NULL,
  "posted_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "claim_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "claim_id" uuid NOT NULL REFERENCES "claims"("id"),
  "filename" text NOT NULL,
  "mime_type" text NOT NULL,
  "storage_path" text NOT NULL,
  "doc_type" text DEFAULT 'other' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "claim_activity" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "claim_id" uuid NOT NULL REFERENCES "claims"("id"),
  "event_type" text NOT NULL,
  "body" text NOT NULL,
  "actor" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "commissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "agent_id" uuid,
  "policy_id" uuid REFERENCES "policies"("id"),
  "carrier_id" uuid REFERENCES "carriers"("id"),
  "line_of_business" text,
  "premium" numeric(12, 2),
  "rate_pct" numeric(6, 3),
  "amount" numeric(12, 2),
  "status" text DEFAULT 'pending' NOT NULL,
  "due_date" timestamp with time zone,
  "paid_date" timestamp with time zone,
  "period" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "commission_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "commission_id" uuid REFERENCES "commissions"("id"),
  "actor_id" uuid,
  "from_status" text,
  "to_status" text,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "agency_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "fiscal_year_start_month" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "record_asks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "author_id" uuid,
  "kind" text DEFAULT 'question' NOT NULL,
  "body" text NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "resolved_by" uuid,
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "carrier_goals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "carrier_id" uuid REFERENCES "carriers"("id"),
  "year" integer NOT NULL,
  "premium_goal" numeric(14, 2),
  "policy_goal" integer,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "drivers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "policy_id" uuid REFERENCES "policies"("id"),
  "deal_id" uuid REFERENCES "deals"("id"),
  "quote_sheet_id" uuid,
  "risk_id" uuid,
  "contact_id" uuid REFERENCES "contacts"("id"),
  "first_name" text NOT NULL,
  "last_name" text NOT NULL,
  "date_of_birth" text,
  "license_number" text,
  "license_state" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "vehicles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "policy_id" uuid REFERENCES "policies"("id"),
  "deal_id" uuid REFERENCES "deals"("id"),
  "quote_sheet_id" uuid,
  "risk_id" uuid,
  "year" integer,
  "make" text,
  "model" text,
  "vin" text,
  "usage" text,
  "garaging_zip" text,
  "garaging_address" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "policy_terms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "policy_id" uuid NOT NULL REFERENCES "policies"("id"),
  "role" text DEFAULT 'current' NOT NULL,
  "term_effective" timestamp with time zone NOT NULL,
  "term_expiration" timestamp with time zone NOT NULL,
  "premium" numeric(12, 2),
  "aop_deductible" text,
  "hurricane_deductible" text,
  "comprehensive_deductible" text,
  "collision_deductible" text,
  "coverages" jsonb,
  "notes" text,
  "source" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "renewal_compare_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "policy_id" uuid REFERENCES "policies"("id"),
  "current_term_id" uuid,
  "proposed_term_id" uuid,
  "event_type" text NOT NULL,
  "current_premium" numeric(12, 2),
  "proposed_premium" numeric(12, 2),
  "delta" numeric(12, 2),
  "pct" numeric(8, 4),
  "summary" text,
  "snapshot" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "policy_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "policy_id" uuid REFERENCES "policies"("id"),
  "kind" text NOT NULL,
  "effective_date" timestamp with time zone,
  "reason" text,
  "summary" text,
  "change_set" jsonb,
  "premises_key" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "policy_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "policy_id" uuid REFERENCES "policies"("id"),
  "event_id" uuid,
  "filename" text NOT NULL,
  "mime_type" text NOT NULL,
  "storage_path" text NOT NULL,
  "doc_type" text DEFAULT 'other' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "policy_work_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "policy_id" uuid NOT NULL REFERENCES "policies"("id"),
  "assignee_id" uuid,
  "work_status" text DEFAULT 'ready' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "policy_work_items_policy_uidx" ON "policy_work_items" ("tenant_id","policy_id");
CREATE TABLE IF NOT EXISTS "policy_work_flags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "work_item_id" uuid REFERENCES "policy_work_items"("id"),
  "policy_id" uuid,
  "flag" text NOT NULL,
  "created_by" uuid,
  "cleared_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "policy_work_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "work_item_id" uuid REFERENCES "policy_work_items"("id"),
  "author_id" uuid,
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "contacts_zoho_idx" ON "contacts" ("tenant_id","zoho_id");
CREATE INDEX IF NOT EXISTS "accounts_zoho_idx" ON "accounts" ("tenant_id","zoho_id");
CREATE INDEX IF NOT EXISTS "policies_zoho_idx" ON "policies" ("tenant_id","zoho_id");
