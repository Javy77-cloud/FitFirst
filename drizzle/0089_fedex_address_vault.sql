-- sep7ca: FedEx address vault + site-developer flag.
-- Additive only. Does not wipe or reseed the Zoho book.
-- Leaves coverage, stage, bind, Ana unbound, and Cov A alone.
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_site_developer" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "developer_api_vault" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "provider" text NOT NULL,
  "label" text NOT NULL,
  "configured" boolean DEFAULT false NOT NULL,
  "api_key_enc" text,
  "api_key_iv" text,
  "api_secret_enc" text,
  "api_secret_iv" text,
  "account_number_enc" text,
  "account_number_iv" text,
  "environment" text DEFAULT 'sandbox' NOT NULL,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "developer_api_vault_provider_uidx"
  ON "developer_api_vault" ("tenant_id", "provider");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "developer_api_vault_tenant_idx"
  ON "developer_api_vault" ("tenant_id");
