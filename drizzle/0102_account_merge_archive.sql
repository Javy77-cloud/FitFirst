-- Business merge: archive merged account (additive).
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "merged_into_id" uuid;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone;
