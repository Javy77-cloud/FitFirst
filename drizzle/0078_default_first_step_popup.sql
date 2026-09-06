-- sep6w: Default first step notifies in-app so the clock fire is visible.
-- Additive remap only. Does not wipe or reseed the Zoho book.
--> statement-breakpoint
UPDATE "lead_follow_up_steps"
SET "remind_via" = 'popup'
WHERE "id" = 'a0710001-a071-4111-8111-a07100000031'
	AND "remind_via" IS DISTINCT FROM 'popup';
