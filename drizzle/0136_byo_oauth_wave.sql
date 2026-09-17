-- Free BYO OAuth wave: refresh tokens + external busy blocks.
-- Agency-pasted or env client secrets stay AES-GCM. No FitFirst vendor keys.
--> statement-breakpoint
ALTER TABLE "integration_connections" ADD COLUMN IF NOT EXISTS "refresh_token_enc" text;
--> statement-breakpoint
ALTER TABLE "integration_connections" ADD COLUMN IF NOT EXISTS "refresh_token_iv" text;
--> statement-breakpoint
ALTER TABLE "integration_connections" ADD COLUMN IF NOT EXISTS "token_expires_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "integration_connections" ADD COLUMN IF NOT EXISTS "granted_scopes" text;
--> statement-breakpoint
ALTER TABLE "integration_connections" ADD COLUMN IF NOT EXISTS "token_account_email" text;
--> statement-breakpoint
ALTER TABLE "integration_connections" ADD COLUMN IF NOT EXISTS "last_busy_sync_at" timestamptz;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calendar_busy_blocks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "provider" text NOT NULL,
  "owner_user_id" uuid,
  "external_id" text NOT NULL,
  "starts_at" timestamptz NOT NULL,
  "ends_at" timestamptz NOT NULL,
  "title" text,
  "synced_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "calendar_busy_blocks_ext_uidx"
  ON "calendar_busy_blocks" ("tenant_id", "provider", "external_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_busy_blocks_when_idx"
  ON "calendar_busy_blocks" ("tenant_id", "starts_at", "ends_at");
