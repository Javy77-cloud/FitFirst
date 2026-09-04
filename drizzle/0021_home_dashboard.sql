ALTER TABLE "agency_settings"
  ADD COLUMN IF NOT EXISTS "show_company_widgets" boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "user_dashboard_prefs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "user_id" uuid NOT NULL,
  "preset" text NOT NULL DEFAULT 'my_production',
  "hidden_widgets" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "book_scope" text NOT NULL DEFAULT 'agency',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_dashboard_prefs_user_uidx"
  ON "user_dashboard_prefs" ("tenant_id", "user_id");

CREATE TABLE IF NOT EXISTS "contests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "title" text NOT NULL,
  "rules" text NOT NULL,
  "metric" text NOT NULL DEFAULT 'premium',
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone NOT NULL,
  "created_by" uuid,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "contests_tenant_idx" ON "contests" ("tenant_id");
