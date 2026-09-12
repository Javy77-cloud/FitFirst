-- Per-policy manual display-name override (admin-only rename).
--> statement-breakpoint
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "label_override" text;
