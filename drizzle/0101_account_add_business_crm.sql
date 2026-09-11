-- Add Business popup CRM fields (source, referral, industry, note buckets).
-- Additive only. website/tags already exist on accounts.
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "source" text;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "referral" text;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "industry" text;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "life_notes" text;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "health_notes" text;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "pc_notes" text;
