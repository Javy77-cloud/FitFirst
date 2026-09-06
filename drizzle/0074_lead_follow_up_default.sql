-- sep6p: Default template (same steps as Hot) + scoped clock reset.
-- Additive only. Does not wipe or reseed the Zoho book.
--> statement-breakpoint
INSERT INTO "lead_follow_up_templates" ("id", "tenant_id", "name", "trigger_status", "enabled")
SELECT 'a0710001-a071-4111-8111-a07100000004', '11111111-1111-4111-8111-111111111111', 'Default', 'default', true
WHERE EXISTS (SELECT 1 FROM "tenants" WHERE "id" = '11111111-1111-4111-8111-111111111111')
	AND NOT EXISTS (SELECT 1 FROM "lead_follow_up_templates" WHERE "id" = 'a0710001-a071-4111-8111-a07100000004');
--> statement-breakpoint
INSERT INTO "lead_follow_up_steps" ("id", "tenant_id", "template_id", "sort_order", "method", "delay_amount", "delay_unit", "message", "remind_via")
SELECT 'a0710001-a071-4111-8111-a07100000031', '11111111-1111-4111-8111-111111111111', 'a0710001-a071-4111-8111-a07100000004', 0, 'call', 5, 'minutes', 'Call this lead now.', 'task'
WHERE EXISTS (SELECT 1 FROM "lead_follow_up_templates" WHERE "id" = 'a0710001-a071-4111-8111-a07100000004')
	AND NOT EXISTS (SELECT 1 FROM "lead_follow_up_steps" WHERE "id" = 'a0710001-a071-4111-8111-a07100000031');
--> statement-breakpoint
INSERT INTO "lead_follow_up_steps" ("id", "tenant_id", "template_id", "sort_order", "method", "delay_amount", "delay_unit", "message", "remind_via")
SELECT 'a0710001-a071-4111-8111-a07100000032', '11111111-1111-4111-8111-111111111111', 'a0710001-a071-4111-8111-a07100000004', 1, 'text', 30, 'minutes', 'Text if the first call missed.', 'task'
WHERE EXISTS (SELECT 1 FROM "lead_follow_up_templates" WHERE "id" = 'a0710001-a071-4111-8111-a07100000004')
	AND NOT EXISTS (SELECT 1 FROM "lead_follow_up_steps" WHERE "id" = 'a0710001-a071-4111-8111-a07100000032');
--> statement-breakpoint
INSERT INTO "lead_follow_up_steps" ("id", "tenant_id", "template_id", "sort_order", "method", "delay_amount", "delay_unit", "message", "remind_via")
SELECT 'a0710001-a071-4111-8111-a07100000033', '11111111-1111-4111-8111-111111111111', 'a0710001-a071-4111-8111-a07100000004', 2, 'email', 2, 'hours', 'Email a same-day intro if we have not connected.', 'task'
WHERE EXISTS (SELECT 1 FROM "lead_follow_up_templates" WHERE "id" = 'a0710001-a071-4111-8111-a07100000004')
	AND NOT EXISTS (SELECT 1 FROM "lead_follow_up_steps" WHERE "id" = 'a0710001-a071-4111-8111-a07100000033');
--> statement-breakpoint
INSERT INTO "lead_follow_up_steps" ("id", "tenant_id", "template_id", "sort_order", "method", "delay_amount", "delay_unit", "message", "remind_via")
SELECT 'a0710001-a071-4111-8111-a07100000034', '11111111-1111-4111-8111-111111111111', 'a0710001-a071-4111-8111-a07100000004', 3, 'call', 1, 'days', 'Second call the next day.', 'task'
WHERE EXISTS (SELECT 1 FROM "lead_follow_up_templates" WHERE "id" = 'a0710001-a071-4111-8111-a07100000004')
	AND NOT EXISTS (SELECT 1 FROM "lead_follow_up_steps" WHERE "id" = 'a0710001-a071-4111-8111-a07100000034');
--> statement-breakpoint
UPDATE leads AS l
SET first_contact_at = first.occurred, updated_at = now()
FROM (
	SELECT a.lead_id AS lead_id, MIN(COALESCE(al.occurred_at, a.created_at)) AS occurred
	FROM activities a
	LEFT JOIN activity_logs al ON al.activity_id = a.id
	WHERE a.lead_id IS NOT NULL
		AND a.kind IN ('call', 'email', 'sms')
	GROUP BY a.lead_id
) first
WHERE l.id = first.lead_id AND l.first_contact_at IS NULL;
--> statement-breakpoint
UPDATE leads
SET
	status = 'new',
	nurture_until = NULL,
	nurture_remind_via = NULL,
	updated_at = now()
WHERE first_contact_at IS NULL
	AND converted_deal_id IS NULL
	AND lower(coalesce(status, '')) NOT IN ('new', 'converted')
	AND NOT EXISTS (
		SELECT 1 FROM activities a
		WHERE a.lead_id = leads.id
			AND a.kind IN ('call', 'email', 'sms')
	);
--> statement-breakpoint
UPDATE lead_follow_up_queue AS q
SET status = 'cancelled', cancelled_at = now(), updated_at = now()
FROM leads AS l
WHERE q.lead_id = l.id
	AND q.status = 'queued'
	AND l.first_contact_at IS NULL
	AND lower(l.status) = 'new';
