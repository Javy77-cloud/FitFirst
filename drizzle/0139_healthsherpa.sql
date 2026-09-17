-- HealthSherpa BYO Medicare + Marketplace enrollment links.
-- Additive only. Does not wipe or reseed the book.
-- Keys stay in developer_api_vault (providers: healthsherpa_medicare, healthsherpa_aca, healthsherpa_inbound).
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "healthsherpa_enrollments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "product" text NOT NULL,
  "event" text NOT NULL,
  "hs_contact_id" text,
  "hs_application_id" text,
  "hs_external_id" text,
  "confirmation_number" text,
  "contact_id" uuid REFERENCES "contacts"("id"),
  "deal_id" uuid REFERENCES "deals"("id"),
  "policy_id" uuid REFERENCES "policies"("id"),
  "payload" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "healthsherpa_enrollments_app_uidx"
  ON "healthsherpa_enrollments" ("tenant_id", "hs_application_id")
  WHERE "hs_application_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "healthsherpa_enrollments_contact_idx"
  ON "healthsherpa_enrollments" ("tenant_id", "contact_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "healthsherpa_enrollments_deal_idx"
  ON "healthsherpa_enrollments" ("tenant_id", "deal_id");
