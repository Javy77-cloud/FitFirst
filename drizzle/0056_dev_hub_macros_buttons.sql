CREATE TABLE IF NOT EXISTS "desk_macros" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "module" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "enabled" boolean DEFAULT true NOT NULL,
  "actions" jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desk_macros_module_idx" ON "desk_macros" ("tenant_id", "module");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "desk_macro_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "macro_id" uuid NOT NULL REFERENCES "desk_macros"("id"),
  "module" text NOT NULL,
  "record_ids" jsonb NOT NULL,
  "summary" text NOT NULL,
  "ran_by" uuid,
  "ran_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desk_macro_runs_macro_idx" ON "desk_macro_runs" ("tenant_id", "macro_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "desk_custom_buttons" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "module" text NOT NULL,
  "placement" text NOT NULL,
  "label" text NOT NULL,
  "visibility_profiles" jsonb DEFAULT '["admin","agent"]'::jsonb NOT NULL,
  "action_kind" text NOT NULL,
  "function_api_name" text,
  "url_template" text,
  "widget_id" uuid,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desk_custom_buttons_module_idx" ON "desk_custom_buttons" ("tenant_id", "module", "placement");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "desk_client_scripts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "module" text NOT NULL,
  "page" text NOT NULL,
  "event" text NOT NULL,
  "field_name" text,
  "name" text NOT NULL,
  "body" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desk_client_scripts_page_idx" ON "desk_client_scripts" ("tenant_id", "module", "page");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "desk_widgets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "name" text NOT NULL,
  "type" text NOT NULL,
  "hosting" text NOT NULL,
  "external_url" text,
  "zip_meta" jsonb,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desk_widgets_type_idx" ON "desk_widgets" ("tenant_id", "type");
