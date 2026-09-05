ALTER TABLE "desk_macros" ADD COLUMN IF NOT EXISTS "modules" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "desk_macros" ADD COLUMN IF NOT EXISTS "kind" text DEFAULT 'standard' NOT NULL;
