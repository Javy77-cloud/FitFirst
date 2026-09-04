ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "quoting_line" text;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "quoting_form" text;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "sheet_approved_at" timestamptz;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "sheet_approved_by" text;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "quoting_unlocked" boolean DEFAULT false NOT NULL;

ALTER TABLE "quote_sheets" ADD COLUMN IF NOT EXISTS "approved_at" timestamptz;
ALTER TABLE "quote_sheets" ADD COLUMN IF NOT EXISTS "approved_by" text;
ALTER TABLE "quote_sheets" ADD COLUMN IF NOT EXISTS "quoting_unlocked" boolean DEFAULT false NOT NULL;

CREATE TABLE IF NOT EXISTS "integration_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "category" text NOT NULL,
  "provider" text NOT NULL,
  "connected" boolean DEFAULT false NOT NULL,
  "display_label" text,
  "notes" text,
  "last_status" text,
  "connected_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integration_connections_tenant_idx" ON "integration_connections" ("tenant_id", "category");
CREATE UNIQUE INDEX IF NOT EXISTS "integration_connections_pair_uidx" ON "integration_connections" ("tenant_id", "category", "provider");
