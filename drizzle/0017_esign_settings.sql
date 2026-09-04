CREATE TABLE IF NOT EXISTS "esign_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "provider" text DEFAULT 'none' NOT NULL,
  "connected" boolean DEFAULT false NOT NULL,
  "account_label" text,
  "notes" text,
  "last_connect_status" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "esign_settings_tenant_idx" ON "esign_settings" ("tenant_id");
