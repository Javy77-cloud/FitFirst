-- sep7ab: per-module tags on leads / deals / policies, Mac Continuity toggle,
-- and agent-created tag vocabulary. Contacts.tags already exists.
-- Additive only. Does not wipe or reseed the Zoho book. No db:seed.
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "mac_continuity" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "desk_module_tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "module" text NOT NULL,
  "name" text NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desk_module_tags_tenant_idx" ON "desk_module_tags" ("tenant_id", "module");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "desk_module_tags_uidx" ON "desk_module_tags" ("tenant_id", "module", "name");
