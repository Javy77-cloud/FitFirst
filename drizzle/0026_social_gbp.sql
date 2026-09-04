ALTER TABLE "agency_settings"
  ADD COLUMN IF NOT EXISTS "allow_agents_monitor_gbp" boolean DEFAULT false NOT NULL;

ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE "integration_connections" ADD COLUMN IF NOT EXISTS "owner_user_id" uuid;
CREATE INDEX IF NOT EXISTS "alerts_user_idx" ON "alerts" ("tenant_id", "user_id");

CREATE TABLE IF NOT EXISTS "social_lead_offers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "lead_id" uuid NOT NULL REFERENCES "leads"("id"),
  "source" text NOT NULL,
  "platform" text,
  "status" text DEFAULT 'open' NOT NULL,
  "owner_user_id" uuid,
  "offered_to_user_id" uuid,
  "awarded_by_user_id" uuid,
  "awarded_at" timestamp with time zone,
  "alert_id" uuid,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "social_lead_offers_tenant_status_idx"
  ON "social_lead_offers" ("tenant_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "social_lead_offers_lead_uidx"
  ON "social_lead_offers" ("tenant_id", "lead_id");
