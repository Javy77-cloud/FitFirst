ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "ssn_enc" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "ssn_iv" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "ssn_last4" text;

ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "ein_enc" text;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "ein_iv" text;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "ein_last4" text;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "ein_lookup" text;

ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "license_number_enc" text;
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "license_number_iv" text;
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "license_number_last4" text;

CREATE TABLE IF NOT EXISTS "pii_reveal_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "actor_id" uuid,
  "actor_name" text,
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "field_key" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "accounts_ein_lookup_idx" ON "accounts" ("tenant_id", "ein_lookup");
CREATE INDEX IF NOT EXISTS "pii_reveal_logs_entity_idx" ON "pii_reveal_logs" ("tenant_id", "entity_type", "entity_id");
