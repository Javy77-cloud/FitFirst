ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "agency_name" text;
ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "logo_path" text;
ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "email_signature" text;

ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "portal_url" text;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "customer_service_phone" text;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "agent_phone" text;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "website" text;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "carrier_info" text;

ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "renewal_date" timestamptz;
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "commission_family" text;
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "selling_agency" text;
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "policy_sub_type" text;
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "insured_count" integer;
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "commission4_pct" numeric(6, 3);
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "oep_start" timestamptz;

ALTER TABLE "activity_logs" ADD COLUMN IF NOT EXISTS "lead_id" uuid REFERENCES "leads"("id");
ALTER TABLE "activity_logs" ADD COLUMN IF NOT EXISTS "direction" text;
ALTER TABLE "activity_logs" ADD COLUMN IF NOT EXISTS "thread_key" text;
ALTER TABLE "activity_logs" ADD COLUMN IF NOT EXISTS "subject" text;
ALTER TABLE "activity_logs" ADD COLUMN IF NOT EXISTS "from_address" text;
ALTER TABLE "activity_logs" ADD COLUMN IF NOT EXISTS "to_address" text;
CREATE INDEX IF NOT EXISTS "activity_logs_deal_idx" ON "activity_logs" ("tenant_id","deal_id");
CREATE INDEX IF NOT EXISTS "activity_logs_thread_idx" ON "activity_logs" ("tenant_id","thread_key");

ALTER TABLE "record_asks" ADD COLUMN IF NOT EXISTS "assignee_id" uuid;

CREATE TABLE IF NOT EXISTS "desk_column_prefs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "user_id" uuid,
  "table_key" text NOT NULL,
  "columns" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "desk_column_prefs_uidx" ON "desk_column_prefs" ("tenant_id","user_id","table_key");

CREATE TABLE IF NOT EXISTS "commission_rate_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "line_family" text NOT NULL,
  "rate_pct" numeric(6, 3),
  "per_person_month" numeric(10, 2),
  "medicare_new" numeric(10, 2),
  "medicare_renewal" numeric(10, 2),
  "notes" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "policy_automations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "policy_id" uuid REFERENCES "policies"("id"),
  "kind" text NOT NULL,
  "fire_on" timestamptz,
  "status" text DEFAULT 'open' NOT NULL,
  "body" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "policy_automations_tenant_idx" ON "policy_automations" ("tenant_id","policy_id","kind");
