-- sep7ba: required / default / picklist id on custom fields + reusable picklists.
-- Additive only. Does not wipe or reseed. Ana unbound. Cov A $321,000 stays.
--> statement-breakpoint
ALTER TABLE "desk_custom_fields" ADD COLUMN IF NOT EXISTS "required" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "desk_custom_fields" ADD COLUMN IF NOT EXISTS "default_value" text;
--> statement-breakpoint
ALTER TABLE "desk_custom_fields" ADD COLUMN IF NOT EXISTS "picklist_id" uuid;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "desk_field_picklists" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "name" text NOT NULL,
  "options" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desk_field_picklists_tenant_idx" ON "desk_field_picklists" ("tenant_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "desk_field_picklists_uidx" ON "desk_field_picklists" ("tenant_id", "name");
