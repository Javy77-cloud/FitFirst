-- sep7bb: optional color on desk_module_tags so agents can pick/edit tag colors.
-- Additive only. Does not wipe or reseed the Zoho book. No db:seed.
-- Existing rows stay NULL and keep the default secondary chip until edited.
--> statement-breakpoint
ALTER TABLE "desk_module_tags" ADD COLUMN IF NOT EXISTS "color" text;
