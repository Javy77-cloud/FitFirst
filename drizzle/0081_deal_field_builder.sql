-- sep7as: custom field catalog, per-LOB layouts, and per-record values.
-- Additive only. Does not rewrite Lead/Deal/Contact core columns. No db:seed.
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "desk_custom_fields" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "module" text DEFAULT 'deals' NOT NULL,
  "key" text NOT NULL,
  "label" text NOT NULL,
  "type" text DEFAULT 'single_line' NOT NULL,
  "options" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "formula" text,
  "lookup_module" text,
  "system_key" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desk_custom_fields_tenant_idx" ON "desk_custom_fields" ("tenant_id", "module");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "desk_custom_fields_uidx" ON "desk_custom_fields" ("tenant_id", "module", "key");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "desk_field_layouts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "module" text DEFAULT 'deals' NOT NULL,
  "line_of_business" text NOT NULL,
  "columns" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "desk_field_layouts_uidx" ON "desk_field_layouts" ("tenant_id", "module", "line_of_business");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "desk_custom_field_values" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "module" text DEFAULT 'deals' NOT NULL,
  "record_id" uuid NOT NULL,
  "field_key" text NOT NULL,
  "value" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desk_custom_field_values_record_idx" ON "desk_custom_field_values" ("tenant_id", "module", "record_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "desk_custom_field_values_uidx" ON "desk_custom_field_values" ("tenant_id", "module", "record_id", "field_key");
