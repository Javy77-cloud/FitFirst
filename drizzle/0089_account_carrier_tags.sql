-- sep7bx: per-module tag catalog on Business (accounts) and Carriers.
-- Leads / Deals / Contacts / Policies already have tags + desk_module_tags.
-- Additive only. Does not wipe or reseed the Zoho book. No db:seed.
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;
