-- sep6t: Default playbook maps to status contacted. Additive remap only.
-- Does not wipe or reseed the Zoho book. No new columns.
--> statement-breakpoint
UPDATE "lead_follow_up_templates"
SET "trigger_status" = 'contacted', "updated_at" = now()
WHERE "id" = 'a0710001-a071-4111-8111-a07100000004'
	AND "trigger_status" IN ('default', 'new');
