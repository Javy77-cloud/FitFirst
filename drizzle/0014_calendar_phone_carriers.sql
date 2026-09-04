ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "am_best_rating" text;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "underwriter_name" text;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "underwriter_email" text;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "underwriter_phone" text;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "account_manager_name" text;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "account_manager_email" text;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "account_manager_phone" text;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "claims_phone" text;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "billing_phone" text;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "new_business_comm_pct" text;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "renewal_comm_pct" text;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "territory" text;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "preferred_submission" text;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "binding_authority" text;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "appetite_notes" text;

ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "phone_number" text;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "direction" text;

CREATE TABLE IF NOT EXISTS "telephony_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "provider" text DEFAULT 'none' NOT NULL,
  "connected" boolean DEFAULT false NOT NULL,
  "display_from" text,
  "account_label" text,
  "notes" text,
  "last_connect_status" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "telephony_settings_tenant_idx" ON "telephony_settings" ("tenant_id");
