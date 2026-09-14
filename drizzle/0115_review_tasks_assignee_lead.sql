-- Desk tasks: assignee + lead link for Create Task form.
--> statement-breakpoint
ALTER TABLE "review_tasks" ADD COLUMN IF NOT EXISTS "lead_id" uuid;
--> statement-breakpoint
ALTER TABLE "review_tasks" ADD COLUMN IF NOT EXISTS "assignee_id" uuid;
