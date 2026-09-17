-- Developer profile hub: month meters for real vendor HTTP only.
-- Optional monthly_limit is display-only in this starter (never invent counts).
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "developer_api_usage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "provider" text NOT NULL,
  "month" text NOT NULL,
  "call_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "developer_api_usage_tenant_provider_month_uidx"
  ON "developer_api_usage" ("tenant_id", "provider", "month");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "developer_api_usage_tenant_month_idx"
  ON "developer_api_usage" ("tenant_id", "month");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "developer_api_meter_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "provider" text NOT NULL,
  "monthly_limit" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "developer_api_meter_settings_tenant_provider_uidx"
  ON "developer_api_meter_settings" ("tenant_id", "provider");
