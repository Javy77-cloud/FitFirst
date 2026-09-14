-- Per-module tags on Tasks (review_tasks), same jsonb pattern as contacts/policies.
-- Additive only. Does not wipe or reseed. No db:seed.
--> statement-breakpoint
ALTER TABLE "review_tasks" ADD COLUMN IF NOT EXISTS "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;
