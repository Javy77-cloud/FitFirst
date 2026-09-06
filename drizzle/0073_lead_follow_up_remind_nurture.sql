ALTER TABLE "lead_follow_up_steps" ADD COLUMN IF NOT EXISTS "remind_via" text DEFAULT 'task' NOT NULL;
--> statement-breakpoint
ALTER TABLE "lead_follow_up_queue" ADD COLUMN IF NOT EXISTS "remind_via" text DEFAULT 'task' NOT NULL;
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "nurture_until" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "nurture_remind_via" text;
