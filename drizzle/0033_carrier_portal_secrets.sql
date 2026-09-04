ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "agency_code" text;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "portal_username_enc" text;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "portal_username_iv" text;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "portal_username_hint" text;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "portal_password_enc" text;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "portal_password_iv" text;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "portal_secrets_updated_at" timestamptz;

CREATE TABLE IF NOT EXISTS "carrier_secret_reveal_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "carrier_id" uuid NOT NULL REFERENCES "carriers"("id"),
  "actor_id" uuid,
  "actor_name" text,
  "field_key" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "carrier_secret_reveal_logs_carrier_idx"
  ON "carrier_secret_reveal_logs" ("tenant_id", "carrier_id", "created_at");
